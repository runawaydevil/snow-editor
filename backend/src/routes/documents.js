import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { checkDbHealth, getDb, purgeExpiredLocks } from '../db.js';
import {
  APP_VERSION,
  DEFAULT_DOCUMENT_TITLE,
  MSG,
} from '../messages.js';
import { requireAllowedOrigin } from '../originGuard.js';
import { maybeSaveDocumentVersion, saveDocumentVersion } from '../versionUtils.js';
import {
  assertContentSize,
  assertMode,
  isExpired,
  lockExpiresAtFromNow,
  newId,
  parseExpiresIn,
  secureToken,
  sendError,
} from '../utils.js';

const router = Router();

const createDocLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMIT',
    message: MSG.RATE_LIMIT,
  },
});

function getDocumentByViewToken(token) {
  return getDb()
    .prepare('SELECT * FROM documents WHERE view_token = ?')
    .get(token);
}

function getDocumentByEditToken(token) {
  return getDb()
    .prepare('SELECT * FROM documents WHERE edit_token = ?')
    .get(token);
}

function documentToPublic(doc) {
  return {
    id: doc.id,
    title: doc.title,
    mode: doc.mode,
    content: doc.content,
    expiresAt: doc.expires_at,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}

function checkDocumentAccess(doc, res) {
  if (!doc) {
    sendError(res, 404, 'NOT_FOUND', MSG.NOT_FOUND);
    return false;
  }
  if (isExpired(doc.expires_at)) {
    sendError(res, 410, 'EXPIRED', MSG.EXPIRED);
    return false;
  }
  return true;
}

function getActiveLock(documentId) {
  purgeExpiredLocks(getDb());
  const now = new Date().toISOString();
  return getDb()
    .prepare(
      'SELECT * FROM edit_locks WHERE document_id = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 1',
    )
    .get(documentId, now);
}

function validateLock(doc, clientId, lockToken) {
  purgeExpiredLocks(getDb());
  const lock = getDb()
    .prepare(
      'SELECT * FROM edit_locks WHERE document_id = ? AND lock_token = ? AND client_id = ?',
    )
    .get(doc.id, lockToken, clientId);

  if (!lock || isExpired(lock.expires_at)) {
    return null;
  }
  return lock;
}

router.get('/health', (_req, res) => {
  const dbOk = checkDbHealth(getDb());
  const payload = {
    ok: dbOk,
    db: dbOk ? 'ok' : 'error',
    uptime: Math.floor(process.uptime()),
    version: APP_VERSION,
  };

  if (!dbOk) {
    console.error('[health] database check failed');
    return res.status(503).json(payload);
  }

  res.json(payload);
});

router.post('/documents', createDocLimiter, requireAllowedOrigin, (req, res) => {
  const { title, mode, content, expiresIn } = req.body ?? {};

  if (!assertMode(mode)) {
    return sendError(res, 400, 'INVALID_MODE', MSG.INVALID_MODE);
  }

  if (typeof content !== 'string') {
    return sendError(res, 400, 'INVALID_CONTENT', MSG.INVALID_CONTENT);
  }

  if (!assertContentSize(content)) {
    return sendError(res, 413, 'CONTENT_TOO_LARGE', MSG.CONTENT_TOO_LARGE);
  }

  const expiresAt = parseExpiresIn(expiresIn);
  if (expiresAt === undefined) {
    return sendError(res, 400, 'INVALID_EXPIRES_IN', MSG.INVALID_EXPIRES_IN);
  }

  const id = newId();
  const viewToken = secureToken();
  const editToken = secureToken();
  const docTitle =
    typeof title === 'string' && title.trim() ? title.trim() : DEFAULT_DOCUMENT_TITLE;
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO documents (id, title, mode, content, view_token, edit_token, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, docTitle, mode, content, viewToken, editToken, expiresAt, now, now);

  res.status(201).json({
    id,
    title: docTitle,
    mode,
    viewToken,
    editToken,
    viewUrl: `/v/${viewToken}`,
    editUrl: `/e/${editToken}`,
    expiresAt,
  });
});

router.get('/documents/view/:token', (req, res) => {
  const doc = getDocumentByViewToken(req.params.token);
  if (!checkDocumentAccess(doc, res)) return;
  res.json(documentToPublic(doc));
});

router.get('/documents/edit/:token', (req, res) => {
  const doc = getDocumentByEditToken(req.params.token);
  if (!checkDocumentAccess(doc, res)) return;
  res.json(documentToPublic(doc));
});

router.get('/documents/edit/:token/versions', (req, res) => {
  const { clientId, lockToken } = req.query;

  if (!clientId || !lockToken) {
    return sendError(res, 403, 'LOCK_REQUIRED', MSG.LOCK_REQUIRED);
  }

  const doc = getDocumentByEditToken(req.params.token);
  if (!checkDocumentAccess(doc, res)) return;

  const lock = validateLock(doc, String(clientId), String(lockToken));
  if (!lock) {
    return sendError(res, 403, 'LOCK_REQUIRED', MSG.LOCK_REQUIRED);
  }

  const versions = getDb()
    .prepare(
      `SELECT id, created_at FROM document_versions
       WHERE document_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
    )
    .all(doc.id)
    .map((row) => ({
      id: row.id,
      createdAt: row.created_at,
    }));

  res.json({ versions });
});

router.post('/documents/edit/:token/versions/:versionId/restore', (req, res) => {
  const { clientId, lockToken } = req.body ?? {};

  if (!clientId || !lockToken) {
    return sendError(res, 403, 'LOCK_REQUIRED', MSG.LOCK_REQUIRED);
  }

  const doc = getDocumentByEditToken(req.params.token);
  if (!checkDocumentAccess(doc, res)) return;

  const lock = validateLock(doc, clientId, lockToken);
  if (!lock) {
    return sendError(res, 403, 'LOCK_REQUIRED', MSG.LOCK_REQUIRED);
  }

  const version = getDb()
    .prepare(
      'SELECT * FROM document_versions WHERE id = ? AND document_id = ?',
    )
    .get(req.params.versionId, doc.id);

  if (!version) {
    return sendError(res, 404, 'VERSION_NOT_FOUND', MSG.VERSION_NOT_FOUND);
  }

  const now = new Date().toISOString();
  const db = getDb();

  saveDocumentVersion(db, doc, now);

  db.prepare(
    `UPDATE documents SET title = ?, mode = ?, content = ?, updated_at = ? WHERE id = ?`,
  ).run(version.title, version.mode, version.content, now, doc.id);

  const lockExpires = lockExpiresAtFromNow();
  db.prepare('UPDATE edit_locks SET expires_at = ?, updated_at = ? WHERE id = ?').run(
    lockExpires,
    now,
    lock.id,
  );

  res.json({
    success: true,
    title: version.title,
    mode: version.mode,
    content: version.content,
    updated_at: now,
  });
});

router.post('/documents/edit/:token/lock', (req, res) => {
  const { clientId } = req.body ?? {};
  if (!clientId || typeof clientId !== 'string') {
    return sendError(res, 400, 'INVALID_CLIENT', MSG.INVALID_CLIENT);
  }

  const doc = getDocumentByEditToken(req.params.token);
  if (!checkDocumentAccess(doc, res)) return;

  purgeExpiredLocks(getDb());
  const activeLock = getActiveLock(doc.id);

  if (activeLock) {
    if (activeLock.client_id === clientId) {
      const expiresAt = lockExpiresAtFromNow();
      const now = new Date().toISOString();
      getDb()
        .prepare(
          'UPDATE edit_locks SET expires_at = ?, updated_at = ? WHERE id = ?',
        )
        .run(expiresAt, now, activeLock.id);

      return res.json({
        locked: true,
        lockToken: activeLock.lock_token,
        expiresAt,
      });
    }

    return res.status(423).json({
      locked: false,
      error: 'DOCUMENT_LOCKED',
      message: MSG.DOCUMENT_LOCKED,
      lockExpiresAt: activeLock.expires_at,
    });
  }

  const lockId = newId();
  const lockToken = secureToken();
  const expiresAt = lockExpiresAtFromNow();
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO edit_locks (id, document_id, lock_token, client_id, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(lockId, doc.id, lockToken, clientId, expiresAt, now, now);

  res.json({ locked: true, lockToken, expiresAt });
});

router.post('/documents/edit/:token/lock/refresh', (req, res) => {
  const { clientId, lockToken } = req.body ?? {};
  if (!clientId || !lockToken) {
    return sendError(res, 400, 'INVALID_REQUEST', MSG.INVALID_REQUEST);
  }

  const doc = getDocumentByEditToken(req.params.token);
  if (!checkDocumentAccess(doc, res)) return;

  purgeExpiredLocks(getDb());
  const lock = getDb()
    .prepare(
      'SELECT * FROM edit_locks WHERE document_id = ? AND lock_token = ? AND client_id = ?',
    )
    .get(doc.id, lockToken, clientId);

  if (!lock || isExpired(lock.expires_at)) {
    return sendError(res, 403, 'LOCK_INVALID', MSG.LOCK_INVALID);
  }

  const expiresAt = lockExpiresAtFromNow();
  const now = new Date().toISOString();
  getDb()
    .prepare('UPDATE edit_locks SET expires_at = ?, updated_at = ? WHERE id = ?')
    .run(expiresAt, now, lock.id);

  res.json({ locked: true, lockToken, expiresAt });
});

router.delete('/documents/edit/:token/lock', (req, res) => {
  const { clientId, lockToken } = req.body ?? {};
  if (!clientId || !lockToken) {
    return sendError(res, 400, 'INVALID_REQUEST', MSG.INVALID_REQUEST);
  }

  const doc = getDocumentByEditToken(req.params.token);
  if (!doc) {
    return sendError(res, 404, 'NOT_FOUND', MSG.NOT_FOUND);
  }

  const result = getDb()
    .prepare(
      'DELETE FROM edit_locks WHERE document_id = ? AND lock_token = ? AND client_id = ?',
    )
    .run(doc.id, lockToken, clientId);

  if (result.changes === 0) {
    return sendError(res, 403, 'LOCK_INVALID', MSG.LOCK_INVALID);
  }

  res.json({ success: true });
});

router.put('/documents/edit/:token', (req, res) => {
  const { clientId, lockToken, title, mode, content } = req.body ?? {};

  if (!clientId || !lockToken) {
    return sendError(res, 403, 'LOCK_REQUIRED', MSG.LOCK_REQUIRED);
  }

  const doc = getDocumentByEditToken(req.params.token);
  if (!checkDocumentAccess(doc, res)) return;

  const lock = validateLock(doc, clientId, lockToken);
  if (!lock) {
    return sendError(res, 403, 'LOCK_REQUIRED', MSG.LOCK_REQUIRED);
  }

  if (!assertMode(mode)) {
    return sendError(res, 400, 'INVALID_MODE', MSG.INVALID_MODE);
  }

  if (typeof content !== 'string') {
    return sendError(res, 400, 'INVALID_CONTENT', MSG.INVALID_CONTENT);
  }

  if (!assertContentSize(content)) {
    return sendError(res, 413, 'CONTENT_TOO_LARGE', MSG.CONTENT_TOO_LARGE);
  }

  const docTitle =
    typeof title === 'string' && title.trim() ? title.trim() : doc.title;
  const now = new Date().toISOString();
  const db = getDb();

  maybeSaveDocumentVersion(db, doc, now);

  db.prepare(
    `UPDATE documents SET title = ?, mode = ?, content = ?, updated_at = ? WHERE id = ?`,
  ).run(docTitle, mode, content, now, doc.id);

  const expiresAt = lockExpiresAtFromNow();
  db.prepare('UPDATE edit_locks SET expires_at = ?, updated_at = ? WHERE id = ?').run(
    expiresAt,
    now,
    lock.id,
  );

  res.json({ success: true, updated_at: now });
});

export default router;

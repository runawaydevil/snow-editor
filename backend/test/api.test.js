import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../src/app.js';
import { getDb, initDb } from '../src/db.js';
const ALLOWED_ORIGIN = 'http://localhost:41737';

let server;
let baseUrl;

function api(path, { method = 'GET', headers = {}, body } = {}) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function readJson(res) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function createDocument(overrides = {}) {
  const res = await api('/api/documents', {
    method: 'POST',
    headers: { Origin: ALLOWED_ORIGIN },
    body: {
      title: 'Test doc',
      mode: 'markdown',
      content: '# Hello',
      expiresIn: '7d',
      ...overrides,
    },
  });
  assert.equal(res.status, 201);
  return readJson(res);
}

before(() => {
  initDb(':memory:');
  const app = createApp({
    shareAllowedOrigins: ALLOWED_ORIGIN,
  });
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(() => {
  server.close();
});

describe('Snow Editor API', () => {
  test('GET /api/health returns ok with db check', async () => {
    const res = await api('/api/health');
    const data = await readJson(res);

    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.db, 'ok');
    assert.equal(typeof data.uptime, 'number');
    assert.equal(data.version, '0.0.1');
  });

  test('POST /documents without Origin is rejected', async () => {
    const res = await api('/api/documents', {
      method: 'POST',
      body: {
        title: 'Blocked',
        mode: 'markdown',
        content: 'nope',
        expiresIn: '7d',
      },
    });
    const data = await readJson(res);

    assert.equal(res.status, 403);
    assert.equal(data.error, 'ORIGIN_NOT_ALLOWED');
  });

  test('POST /documents with allowed Origin succeeds', async () => {
    const data = await createDocument({ title: 'Allowed' });
    assert.ok(data.viewToken);
    assert.ok(data.editToken);
  });

  test('GET /view/:token returns document', async () => {
    const doc = await createDocument({ content: '# View me' });
    const res = await api(`/api/documents/view/${doc.viewToken}`);
    const data = await readJson(res);

    assert.equal(res.status, 200);
    assert.equal(data.content, '# View me');
  });

  test('POST lock acquires edit lock', async () => {
    const doc = await createDocument();
    const res = await api(`/api/documents/edit/${doc.editToken}/lock`, {
      method: 'POST',
      body: { clientId: 'client-a' },
    });
    const data = await readJson(res);

    assert.equal(res.status, 200);
    assert.equal(data.locked, true);
    assert.ok(data.lockToken);
  });

  test('second clientId on lock returns 423', async () => {
    const doc = await createDocument();
    await api(`/api/documents/edit/${doc.editToken}/lock`, {
      method: 'POST',
      body: { clientId: 'client-a' },
    });

    const res = await api(`/api/documents/edit/${doc.editToken}/lock`, {
      method: 'POST',
      body: { clientId: 'client-b' },
    });
    const data = await readJson(res);

    assert.equal(res.status, 423);
    assert.equal(data.error, 'DOCUMENT_LOCKED');
  });

  test('PUT without lock returns 403', async () => {
    const doc = await createDocument();
    const res = await api(`/api/documents/edit/${doc.editToken}`, {
      method: 'PUT',
      body: {
        clientId: 'ghost',
        lockToken: 'missing',
        title: 'Nope',
        mode: 'markdown',
        content: 'fail',
      },
    });
    const data = await readJson(res);

    assert.equal(res.status, 403);
    assert.equal(data.error, 'LOCK_REQUIRED');
  });

  test('expired document returns 410', async () => {
    const doc = await createDocument();
    const past = new Date(Date.now() - 60_000).toISOString();
    getDb()
      .prepare('UPDATE documents SET expires_at = ? WHERE edit_token = ?')
      .run(past, doc.editToken);

    const res = await api(`/api/documents/edit/${doc.editToken}`);
    const data = await readJson(res);

    assert.equal(res.status, 410);
    assert.equal(data.error, 'EXPIRED');
  });

  test('body larger than 1 MB returns 413', async () => {
    const doc = await createDocument();
    const lockRes = await api(`/api/documents/edit/${doc.editToken}/lock`, {
      method: 'POST',
      body: { clientId: 'big-body' },
    });
    const lock = await readJson(lockRes);

    const huge = 'x'.repeat(1024 * 1024 + 1);
    const res = await api(`/api/documents/edit/${doc.editToken}`, {
      method: 'PUT',
      body: {
        clientId: 'big-body',
        lockToken: lock.lockToken,
        title: 'Huge',
        mode: 'markdown',
        content: huge,
      },
    });
    const data = await readJson(res);

    assert.equal(res.status, 413);
    assert.equal(data.error, 'CONTENT_TOO_LARGE');
  });

  test('version list and restore require active lock', async () => {
    const doc = await createDocument({ content: 'v1' });
    const lockRes = await api(`/api/documents/edit/${doc.editToken}/lock`, {
      method: 'POST',
      body: { clientId: 'version-client' },
    });
    const lock = await readJson(lockRes);

    await api(`/api/documents/edit/${doc.editToken}`, {
      method: 'PUT',
      body: {
        clientId: 'version-client',
        lockToken: lock.lockToken,
        title: doc.title,
        mode: 'markdown',
        content: 'v2',
      },
    });

    const versionsRes = await api(
      `/api/documents/edit/${doc.editToken}/versions?clientId=version-client&lockToken=${lock.lockToken}`,
    );
    const versionsData = await readJson(versionsRes);

    assert.equal(versionsRes.status, 200);
    assert.ok(versionsData.versions.length >= 1);

    const versionId = versionsData.versions[0].id;
    const restoreRes = await api(
      `/api/documents/edit/${doc.editToken}/versions/${versionId}/restore`,
      {
        method: 'POST',
        body: {
          clientId: 'version-client',
          lockToken: lock.lockToken,
        },
      },
    );
    const restored = await readJson(restoreRes);

    assert.equal(restoreRes.status, 200);
    assert.equal(restored.content, 'v1');
  });
});

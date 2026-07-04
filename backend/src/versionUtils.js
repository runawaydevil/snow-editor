import { MAX_VERSIONS_PER_DOCUMENT } from './messages.js';
import { newId } from './utils.js';

// Autosave fires every second while typing; without coalescing the version
// history fills up with near-identical snapshots within minutes.
export const VERSION_COALESCE_MS = 5 * 60 * 1000;

export function saveDocumentVersion(db, doc, createdAt) {
  const versionId = newId();
  db.prepare(
    `INSERT INTO document_versions (id, document_id, title, mode, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(versionId, doc.id, doc.title, doc.mode, doc.content, createdAt);

  const excess = db
    .prepare(
      `SELECT id FROM document_versions
       WHERE document_id = ?
       ORDER BY created_at DESC
       LIMIT -1 OFFSET ?`,
    )
    .all(doc.id, MAX_VERSIONS_PER_DOCUMENT);

  if (excess.length > 0) {
    const placeholders = excess.map(() => '?').join(',');
    db.prepare(`DELETE FROM document_versions WHERE id IN (${placeholders})`).run(
      ...excess.map((row) => row.id),
    );
  }
}

// Snapshot only when the latest version is older than the coalescing window
// (or when there is no version yet). Returns true when a snapshot was taken.
export function maybeSaveDocumentVersion(db, doc, createdAt) {
  const latest = db
    .prepare(
      `SELECT created_at FROM document_versions
       WHERE document_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .get(doc.id);

  if (latest) {
    const age = Date.parse(createdAt) - Date.parse(latest.created_at);
    if (age < VERSION_COALESCE_MS) {
      return false;
    }
  }

  saveDocumentVersion(db, doc, createdAt);
  return true;
}

import { MAX_VERSIONS_PER_DOCUMENT } from './messages.js';
import { newId } from './utils.js';

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

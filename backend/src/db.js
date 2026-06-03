import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

let db;

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function initDb(databasePath) {
  const dir = path.dirname(databasePath);
  fs.mkdirSync(dir, { recursive: true });

  db = new DatabaseSync(databasePath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  initSchema(db);
  return db;
}

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled document',
      mode TEXT NOT NULL CHECK (mode IN ('markdown', 'org')),
      content TEXT NOT NULL DEFAULT '',
      view_token TEXT UNIQUE NOT NULL,
      edit_token TEXT UNIQUE NOT NULL,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS edit_locks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      lock_token TEXT UNIQUE NOT NULL,
      client_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS document_versions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      title TEXT NOT NULL,
      mode TEXT NOT NULL CHECK (mode IN ('markdown', 'org')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_documents_view_token ON documents(view_token);
    CREATE INDEX IF NOT EXISTS idx_documents_edit_token ON documents(edit_token);
    CREATE INDEX IF NOT EXISTS idx_edit_locks_document_id ON edit_locks(document_id);
    CREATE INDEX IF NOT EXISTS idx_edit_locks_lock_token ON edit_locks(lock_token);
  `);
}

export function purgeExpiredLocks(database) {
  const now = new Date().toISOString();
  database.prepare('DELETE FROM edit_locks WHERE expires_at <= ?').run(now);
}

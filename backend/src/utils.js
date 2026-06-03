import crypto from 'crypto';

export const LOCK_TTL_MS = 2 * 60 * 1000;
export const MAX_CONTENT_BYTES = 1024 * 1024;

export function secureToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function newId() {
  return crypto.randomUUID();
}

export function parseExpiresIn(expiresIn) {
  const now = Date.now();
  switch (expiresIn) {
    case '1h':
      return new Date(now + 60 * 60 * 1000).toISOString();
    case '24h':
      return new Date(now + 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
    case 'never':
      return null;
    default:
      return undefined;
  }
}

export function isExpired(expiresAt) {
  if (expiresAt == null) return false;
  return Date.parse(expiresAt) <= Date.now();
}

export function assertMode(mode) {
  return mode === 'markdown' || mode === 'org';
}

export function getContentByteLength(content) {
  return Buffer.byteLength(content ?? '', 'utf8');
}

export function assertContentSize(content) {
  return getContentByteLength(content) <= MAX_CONTENT_BYTES;
}

export function lockExpiresAtFromNow() {
  return new Date(Date.now() + LOCK_TTL_MS).toISOString();
}

export function sendError(res, status, error, message) {
  return res.status(status).json({ error, message });
}

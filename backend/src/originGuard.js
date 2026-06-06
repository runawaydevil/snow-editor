import { MSG } from './messages.js';
import { sendError } from './utils.js';

const DEFAULT_ORIGINS = [
  'http://localhost:41737',
  'http://127.0.0.1:41737',
];

let allowedOrigins = [...DEFAULT_ORIGINS];

export function parseAllowedOrigins(value) {
  if (!value || value.trim() === '') {
    return [...DEFAULT_ORIGINS];
  }
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function setAllowedOrigins(origins) {
  allowedOrigins = origins.length > 0 ? origins : [...DEFAULT_ORIGINS];
}

export function getAllowedOrigins() {
  return allowedOrigins;
}

function normalizeOrigin(urlString) {
  try {
    const url = new URL(urlString);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function resolveRequestOrigin(req) {
  const origin = req.headers.origin;
  if (origin) {
    return normalizeOrigin(origin);
  }

  const referer = req.headers.referer;
  if (referer) {
    return normalizeOrigin(referer);
  }

  return null;
}

export function requireAllowedOrigin(req, res, next) {
  const requestOrigin = resolveRequestOrigin(req);

  if (!requestOrigin || !allowedOrigins.includes(requestOrigin)) {
    console.warn(
      `[origin-guard] blocked POST /documents origin=${requestOrigin ?? 'missing'}`,
    );
    return sendError(res, 403, 'ORIGIN_NOT_ALLOWED', MSG.ORIGIN_NOT_ALLOWED);
  }

  return next();
}

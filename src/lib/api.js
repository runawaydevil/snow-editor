import { STR } from './strings.js';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

function getPublicOrigin() {
  const configured = import.meta.env.VITE_PUBLIC_ORIGIN?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  return window.location.origin;
}

export class ApiError extends Error {
  constructor(status, code, message, payload = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

const ERROR_MESSAGES = {
  NOT_FOUND: STR.NOT_FOUND,
  EXPIRED: STR.EXPIRED,
  DOCUMENT_LOCKED: STR.DOCUMENT_LOCKED,
  LOCK_REQUIRED: STR.LOCK_REQUIRED,
  CONTENT_TOO_LARGE: STR.CONTENT_TOO_LARGE,
  RATE_LIMIT: STR.RATE_LIMIT,
  NETWORK: STR.NETWORK,
};

export function friendlyErrorMessage(error) {
  if (error instanceof ApiError) {
    return error.message || ERROR_MESSAGES[error.code] || STR.GENERIC_ERROR;
  }
  return ERROR_MESSAGES.NETWORK;
}

async function parseResponse(res) {
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const code = data?.error ?? 'UNKNOWN';
    const message =
      data?.message ?? ERROR_MESSAGES[code] ?? STR.UNEXPECTED_ERROR;
    throw new ApiError(res.status, code, message, data ?? {});
  }

  return data;
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(0, 'NETWORK', ERROR_MESSAGES.NETWORK);
  }
  return parseResponse(res);
}

export function createDocument(body) {
  return request('/api/documents', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchViewDocument(token) {
  return request(`/api/documents/view/${encodeURIComponent(token)}`);
}

export function fetchEditDocument(token) {
  return request(`/api/documents/edit/${encodeURIComponent(token)}`);
}

export function acquireEditLock(token, clientId) {
  return request(`/api/documents/edit/${encodeURIComponent(token)}/lock`, {
    method: 'POST',
    body: JSON.stringify({ clientId }),
  });
}

export function refreshEditLock(token, clientId, lockToken) {
  return request(
    `/api/documents/edit/${encodeURIComponent(token)}/lock/refresh`,
    {
      method: 'POST',
      body: JSON.stringify({ clientId, lockToken }),
    },
  );
}

export function releaseEditLock(token, clientId, lockToken) {
  return request(`/api/documents/edit/${encodeURIComponent(token)}/lock`, {
    method: 'DELETE',
    body: JSON.stringify({ clientId, lockToken }),
  });
}

export function updateDocument(token, body) {
  return request(`/api/documents/edit/${encodeURIComponent(token)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function toAbsoluteUrl(path) {
  if (path.startsWith('http')) return path;
  return `${getPublicOrigin()}${path}`;
}

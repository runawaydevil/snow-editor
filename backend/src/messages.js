export const MSG = {
  NOT_FOUND: 'Document not found.',
  EXPIRED: 'This link has expired.',
  INVALID_MODE: 'Invalid mode. Use markdown or org.',
  INVALID_CONTENT: 'Invalid content.',
  CONTENT_TOO_LARGE: 'Document is larger than 1 MB.',
  INVALID_EXPIRES_IN: 'Invalid validity. Use 1h, 24h, 7d, 30d, or never.',
  INVALID_CLIENT: 'clientId is required.',
  INVALID_REQUEST: 'clientId and lockToken are required.',
  DOCUMENT_LOCKED: 'This document is being edited by someone else.',
  LOCK_INVALID: 'Edit lock not found or expired.',
  LOCK_REQUIRED: 'You need an active edit lock to save.',
  RATE_LIMIT: 'Too many requests. Try again in a minute.',
  INVALID_JSON: 'Invalid JSON in request body.',
  INTERNAL_ERROR: 'Internal server error.',
};

export const DEFAULT_DOCUMENT_TITLE = 'Untitled document';

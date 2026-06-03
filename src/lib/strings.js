export const STR = {
  UNTITLED_DOCUMENT: 'Untitled document',

  SHARE: 'Share',
  SHARE_DOCUMENT: 'Share document',
  TITLE: 'Title',
  LINK_VALIDITY: 'Link validity',
  EXPIRY_1H: '1 hour',
  EXPIRY_24H: '24 hours',
  EXPIRY_7D: '7 days',
  EXPIRY_30D: '30 days',
  EXPIRY_NEVER: 'Never expires',
  EXPIRES_ON: (date) => `Expires on ${date}`,
  EXPIRES_SOON: 'Expires soon',
  CANCEL: 'Cancel',
  CLOSE: 'Close',
  CREATING: 'Creating…',
  CREATE_LINKS: 'Create links',
  VIEW_LINK: 'View link',
  EDIT_LINK: 'Edit link',
  COPY: 'Copy',
  COPIED: 'Copied',
  COPY_FAILED: 'Could not copy the link.',

  BADGE_LOCAL: 'Local',
  BADGE_SHARED: 'Shared',
  BADGE_READONLY: 'Read-only',
  BADGE_EDITING: 'Editing',

  SHARED_VIEW: 'Shared view',
  SHARED_EDIT: 'Shared edit',
  SAVE_TO_SERVER: 'Save to server',
  RELEASE_EDIT_LOCK: 'Release edit lock',
  DOWNLOAD_MD: 'Download .md',
  DOWNLOAD_ORG: 'Download .org',

  LOADING_DOCUMENT: 'Loading document…',
  OPEN_IN_SNOW_EDITOR: 'Open in Snow Editor',

  LINK_EXPIRED_TITLE: 'Link expired',
  LINK_EXPIRED_VIEW: 'This link has expired.',
  LINK_EXPIRED_EDIT: 'This edit link has expired.',
  DOCUMENT_NOT_FOUND_TITLE: 'Document not found',
  LOAD_ERROR_TITLE: 'Failed to load',

  LOCKED_BY_OTHER:
    'This document is being edited by someone else. You can view it, but not edit it right now.',
  LOCK_LOST:
    'You lost edit permission for this document. Your text was not deleted. Save a local copy before leaving.',
  LOCK_EXPIRES_AT: 'Lock expires at',

  SAVE_SAVING: 'Saving…',
  SAVE_SAVED: 'Saved',
  SAVE_ERROR: 'Save failed',
  SAVE_NO_PERMISSION: 'No edit permission',

  FOOTER_SHARED: 'Snow Editor · shared document',

  NOT_FOUND: 'Document not found.',
  EXPIRED: 'This link has expired.',
  DOCUMENT_LOCKED: 'This document is being edited by someone else.',
  LOCK_REQUIRED: 'You need an active edit lock to save.',
  CONTENT_TOO_LARGE: 'Document is larger than 1 MB.',
  RATE_LIMIT: 'Too many requests. Try again in a minute.',
  NETWORK: 'Could not connect to the server. Check your connection.',
  GENERIC_ERROR: 'Something went wrong.',
  UNEXPECTED_ERROR: 'An unexpected error occurred.',
};

export const EXPIRY_OPTIONS = [
  { value: '1h', label: STR.EXPIRY_1H },
  { value: '24h', label: STR.EXPIRY_24H },
  { value: '7d', label: STR.EXPIRY_7D },
  { value: '30d', label: STR.EXPIRY_30D },
  { value: 'never', label: STR.EXPIRY_NEVER },
];

const DATE_LOCALE = 'en-US';
const DATE_OPTIONS = { dateStyle: 'medium', timeStyle: 'short' };

export function formatExpiryDate(iso) {
  if (!iso) return STR.EXPIRY_NEVER;
  try {
    return STR.EXPIRES_ON(new Date(iso).toLocaleString(DATE_LOCALE, DATE_OPTIONS));
  } catch {
    return STR.EXPIRES_SOON;
  }
}

export function formatLockExpiry(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(DATE_LOCALE, DATE_OPTIONS);
  } catch {
    return null;
  }
}

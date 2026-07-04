import {
  MODES,
  STORAGE_MARKDOWN,
  STORAGE_ORG,
  initStorage,
  loadContent,
  loadMode,
} from './editorConstants.js';
import { deriveTitle } from './deriveTitle.js';

const INDEX_KEY = 'snow_drafts_index_v1';
const CURRENT_KEY = 'snow_current_draft_id';
const CONTENT_PREFIX = 'snow_draft_';

function contentKey(id) {
  return `${CONTENT_PREFIX}${id}`;
}

function newDraftId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function readIndex() {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((entry) => entry && typeof entry.id === 'string');
  } catch {
    return null;
  }
}

function writeIndex(index) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    return true;
  } catch {
    return false;
  }
}

export function listDrafts() {
  const index = readIndex() ?? [];
  return [...index].sort(
    (a, b) => Date.parse(b.updatedAt ?? 0) - Date.parse(a.updatedAt ?? 0),
  );
}

export function loadDraftContent(id) {
  try {
    return localStorage.getItem(contentKey(id)) ?? '';
  } catch {
    return '';
  }
}

export function getCurrentDraftId() {
  try {
    return localStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}

export function setCurrentDraftId(id) {
  try {
    localStorage.setItem(CURRENT_KEY, id);
  } catch {
    /* ignore */
  }
}

// Persist draft content + refresh its index entry. Returns false on quota.
export function saveDraft(id, { mode, content }) {
  const now = new Date().toISOString();
  let saved = true;
  try {
    localStorage.setItem(contentKey(id), content);
  } catch {
    saved = false;
  }

  const index = readIndex() ?? [];
  const entry = {
    id,
    title: deriveTitle(content, mode),
    mode,
    updatedAt: now,
  };
  const position = index.findIndex((item) => item.id === id);
  if (position >= 0) {
    index[position] = entry;
  } else {
    index.push(entry);
  }
  if (!writeIndex(index)) saved = false;
  return saved;
}

export function createDraft(mode = MODES.MARKDOWN, content = '') {
  const id = newDraftId();
  saveDraft(id, { mode, content });
  setCurrentDraftId(id);
  return { id, mode, content };
}

export function deleteDraft(id) {
  try {
    localStorage.removeItem(contentKey(id));
  } catch {
    /* ignore */
  }
  const index = (readIndex() ?? []).filter((entry) => entry.id !== id);
  writeIndex(index);
}

// One-time migration: turn the single markdown/org drafts of 0.0.1 into
// entries of the drafts index, preserving whichever mode was last used.
function migrateLegacyDrafts() {
  initStorage();
  const index = [];
  const lastMode = loadMode();
  let currentId = null;

  for (const mode of [MODES.MARKDOWN, MODES.ORG]) {
    const legacyKey = mode === MODES.ORG ? STORAGE_ORG : STORAGE_MARKDOWN;
    let hasLegacy = false;
    try {
      hasLegacy = localStorage.getItem(legacyKey) !== null;
    } catch {
      /* ignore */
    }
    if (!hasLegacy && mode !== lastMode) continue;

    const content = loadContent(mode);
    const id = newDraftId();
    index.push({
      id,
      title: deriveTitle(content, mode),
      mode,
      updatedAt: new Date().toISOString(),
    });
    try {
      localStorage.setItem(contentKey(id), content);
    } catch {
      /* ignore */
    }
    if (mode === lastMode) currentId = id;
  }

  writeIndex(index);
  if (currentId) setCurrentDraftId(currentId);
}

// Returns the draft to open: migrates legacy storage on first run and
// guarantees at least one draft exists.
export function ensureDraftsInitialized() {
  if (readIndex() === null) {
    migrateLegacyDrafts();
  }

  let index = readIndex() ?? [];
  if (index.length === 0) {
    const created = createDraft(loadMode(), loadContent(loadMode()));
    return created;
  }

  const currentId = getCurrentDraftId();
  let entry = index.find((item) => item.id === currentId);
  if (!entry) {
    [entry] = listDrafts();
    setCurrentDraftId(entry.id);
  }

  return {
    id: entry.id,
    mode: entry.mode === MODES.ORG ? MODES.ORG : MODES.MARKDOWN,
    content: loadDraftContent(entry.id),
  };
}

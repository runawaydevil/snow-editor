export const STORAGE_MODE = 'editor_mode';
export const STORAGE_MARKDOWN = 'snow_editor_markdown_content';
export const STORAGE_ORG = 'snow_editor_org_content';
export const STORAGE_LEGACY_MARKDOWN = 'cozy-markdown-editor-content';

export const MODES = {
  MARKDOWN: 'markdown',
  ORG: 'org',
};

const DEFAULT_MARKDOWN = `# Snow Journal

Welcome to your quiet writing nook.

Here you can write in **Markdown** and watch the result appear gently beside you.

## Ideas

- Write notes
- Create documents
- Draft texts
- Organize thoughts

> A clean space to think calmly.

\`\`\`js
console.log("writing in peace");
\`\`\`
`;

const DEFAULT_ORG = `* Snow Journal

Welcome to your quiet Org-mode writing nook.

** TODO Ideas
- Write notes
- Create documents
- Organize thoughts

** DONE First draft

#+BEGIN_QUOTE
A clean space to think calmly.
#+END_QUOTE

#+BEGIN_SRC js
console.log("writing in peace");
#+END_SRC

** Example link

[[https://orgmode.org][Official Org-mode site]]
`;

function getStorageKey(mode) {
  return mode === MODES.ORG ? STORAGE_ORG : STORAGE_MARKDOWN;
}

function getDefaultContent(mode) {
  return mode === MODES.ORG ? DEFAULT_ORG : DEFAULT_MARKDOWN;
}

function migrateLegacyStorage() {
  try {
    const legacy = localStorage.getItem(STORAGE_LEGACY_MARKDOWN);
    if (legacy !== null && localStorage.getItem(STORAGE_MARKDOWN) === null) {
      localStorage.setItem(STORAGE_MARKDOWN, legacy);
    }
  } catch {
    /* ignore */
  }
}

export function initStorage() {
  migrateLegacyStorage();
}

export function loadMode() {
  initStorage();
  try {
    const saved = localStorage.getItem(STORAGE_MODE);
    if (saved === MODES.ORG || saved === MODES.MARKDOWN) {
      return saved;
    }
  } catch {
    /* ignore */
  }
  return MODES.MARKDOWN;
}

export function loadContent(mode) {
  try {
    const saved = localStorage.getItem(getStorageKey(mode));
    if (saved === null) {
      return getDefaultContent(mode);
    }
    return saved;
  } catch {
    /* ignore */
  }
  return getDefaultContent(mode);
}

export function persistContent(mode, content) {
  try {
    localStorage.setItem(getStorageKey(mode), content);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      return false;
    }
    return false;
  }
}

export function persistMode(mode) {
  try {
    localStorage.setItem(STORAGE_MODE, mode);
  } catch {
    /* ignore */
  }
}

export function isDefaultContent(mode, text) {
  return text === getDefaultContent(mode);
}

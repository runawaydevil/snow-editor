import { useCallback, useEffect, useRef, useState } from 'react';
import DraftsMenu from '../components/DraftsMenu.jsx';
import IconButton from '../components/IconButton.jsx';
import ShareModal from '../components/ShareModal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import EditorLayout from '../components/EditorLayout.jsx';
import {
  ClearIcon,
  DownloadIcon,
  ShareIcon,
  UploadIcon,
} from '../components/icons/index.js';
import { deriveTitle } from '../lib/deriveTitle.js';
import { downloadDocument } from '../lib/download.js';
import {
  createDraft,
  deleteDraft,
  ensureDraftsInitialized,
  listDrafts,
  loadDraftContent,
  saveDraft,
  setCurrentDraftId,
} from '../lib/drafts.js';
import { MODES, persistMode } from '../lib/editorConstants.js';
import { ensureMarkedLoaded } from '../lib/previewHtml.js';
import { STR } from '../lib/strings.js';

const STORAGE_DEBOUNCE_MS = 500;
// Injected by Vite from package.json — single source of truth for the version.
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const CREATOR_NAME = 'Pablo Murad';
const CREATOR_EMAIL = 'pablomurad@pm.me';

function getFileExtension(filename) {
  const parts = filename.toLowerCase().split('.');
  if (parts.length < 2) return 'txt';
  return parts[parts.length - 1];
}

export default function LocalEditorPage() {
  const [draft, setDraft] = useState(() => ensureDraftsInitialized());
  const [storageWarning, setStorageWarning] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);

  const { id: draftId, mode, content } = draft;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = saveDraft(draftId, { mode, content });
      setStorageWarning(!saved);
    }, STORAGE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [draftId, mode, content]);

  const saveLabel = mode === MODES.ORG ? 'Save .org' : 'Save .md';

  const prefetchMarkdown = useCallback(() => {
    ensureMarkedLoaded();
  }, []);

  const setContent = useCallback((nextContent) => {
    setDraft((current) => ({ ...current, content: nextContent }));
  }, []);

  const handleModeChange = useCallback(
    (nextMode) => {
      if (nextMode === mode) return;
      persistMode(nextMode);
      setDraft((current) => {
        saveDraft(current.id, { mode: nextMode, content: current.content });
        return { ...current, mode: nextMode };
      });
      setStorageWarning(false);
      if (nextMode === MODES.MARKDOWN) prefetchMarkdown();
      editorRef.current?.focus();
    },
    [mode, prefetchMarkdown],
  );

  const flushCurrentDraft = useCallback(() => {
    saveDraft(draftId, { mode, content });
  }, [draftId, mode, content]);

  const handleSelectDraft = useCallback(
    (id) => {
      flushCurrentDraft();
      const entry = listDrafts().find((item) => item.id === id);
      if (!entry) return;
      setCurrentDraftId(id);
      persistMode(entry.mode);
      setDraft({
        id,
        mode: entry.mode === MODES.ORG ? MODES.ORG : MODES.MARKDOWN,
        content: loadDraftContent(id),
      });
      setStorageWarning(false);
      editorRef.current?.focus();
    },
    [flushCurrentDraft],
  );

  const handleCreateDraft = useCallback(() => {
    flushCurrentDraft();
    const created = createDraft(mode, '');
    setDraft(created);
    setStorageWarning(false);
    editorRef.current?.focus();
  }, [flushCurrentDraft, mode]);

  const handleDeleteDraft = useCallback(
    (id) => {
      deleteDraft(id);
      if (id !== draftId) return;
      const next = ensureDraftsInitialized();
      persistMode(next.mode);
      setDraft(next);
    },
    [draftId],
  );

  const handleSave = useCallback(() => {
    downloadDocument(content, mode, deriveTitle(content, mode));
  }, [content, mode]);

  const handleImport = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const ext = getFileExtension(file.name);
      let targetMode = mode;
      if (ext === 'org') targetMode = MODES.ORG;
      else if (ext === 'md' || ext === 'markdown') targetMode = MODES.MARKDOWN;

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') return;

        // Imports land in a fresh draft so the current one is never clobbered.
        flushCurrentDraft();
        const created = createDraft(targetMode, result);
        persistMode(targetMode);
        setDraft(created);
        setStorageWarning(false);
        if (targetMode === MODES.MARKDOWN) prefetchMarkdown();
      };
      reader.readAsText(file);
      event.target.value = '';
    },
    [mode, flushCurrentDraft, prefetchMarkdown],
  );

  const handleClear = useCallback(() => {
    if (content.trim()) {
      const confirmed = window.confirm(
        'Clear the editor and start a blank document? Current content will be replaced.',
      );
      if (!confirmed) return;
    }

    setDraft((current) => {
      saveDraft(current.id, { mode: current.mode, content: '' });
      return { ...current, content: '' };
    });
    setStorageWarning(false);
    editorRef.current?.focus();
  }, [content]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-text">
          <div className="app-header-top">
            <h1 className="app-title">Snow Editor</h1>
            <StatusBadge variant="online">{STR.BADGE_ONLINE}</StatusBadge>
          </div>
          <p className="app-subtitle">Write calmly. See the result live.</p>
          <div className="mode-switch" role="group" aria-label="Editor mode">
            <button
              type="button"
              className={`mode-switch__btn${mode === MODES.MARKDOWN ? ' is-active' : ''}`}
              aria-pressed={mode === MODES.MARKDOWN}
              onClick={() => handleModeChange(MODES.MARKDOWN)}
              onMouseEnter={prefetchMarkdown}
              onFocus={prefetchMarkdown}
            >
              Markdown
            </button>
            <button
              type="button"
              className={`mode-switch__btn${mode === MODES.ORG ? ' is-active' : ''}`}
              aria-pressed={mode === MODES.ORG}
              onClick={() => handleModeChange(MODES.ORG)}
            >
              Org-mode
            </button>
          </div>
        </div>
        <div className="toolbar" role="toolbar" aria-label="Editor actions">
          <DraftsMenu
            currentDraftId={draftId}
            onListDrafts={listDrafts}
            onSelectDraft={handleSelectDraft}
            onCreateDraft={handleCreateDraft}
            onDeleteDraft={handleDeleteDraft}
          />
          <IconButton
            icon={<ShareIcon />}
            label={STR.SHARE}
            onClick={() => setShareOpen(true)}
          />
          <IconButton
            icon={<DownloadIcon />}
            label={mode === MODES.ORG ? 'Save as Org-mode file' : 'Save as Markdown file'}
            onClick={handleSave}
          />
          <IconButton
            icon={<UploadIcon />}
            label="Import file"
            onClick={() => fileInputRef.current?.click()}
          />
          <input
            ref={fileInputRef}
            id="file-import"
            type="file"
            accept=".md,.markdown,.org,.txt,text/markdown,text/plain"
            className="file-input-hidden"
            onChange={handleImport}
            aria-label="Choose file to import"
          />
          <IconButton
            icon={<ClearIcon />}
            variant="ghost"
            label="Clear editor and start blank document"
            onClick={handleClear}
          />
        </div>
      </header>

      <EditorLayout
        mode={mode}
        content={content}
        onContentChange={setContent}
        editorRef={editorRef}
      />

      <footer className="app-footer">
        {storageWarning && (
          <p className="app-storage-warning" role="status">
            Draft too large to save in browser storage; export with {saveLabel}.
          </p>
        )}
        <p className="app-meta">
          Snow Editor v{APP_VERSION} · {CREATOR_NAME} ·{' '}
          <a href={`mailto:${CREATOR_EMAIL}`}>{CREATOR_EMAIL}</a>
        </p>
      </footer>

      {shareOpen && (
        <ShareModal
          open
          onClose={() => setShareOpen(false)}
          title={deriveTitle(content, mode)}
          mode={mode}
          content={content}
        />
      )}
    </div>
  );
}

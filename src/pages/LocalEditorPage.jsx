import { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  MODES,
  isDefaultContent,
  loadContent,
  loadMode,
  persistContent,
  persistMode,
} from '../lib/editorConstants.js';
import { ensureMarkedLoaded } from '../lib/previewHtml.js';
import { STR } from '../lib/strings.js';

const STORAGE_DEBOUNCE_MS = 500;
const APP_VERSION = '0.0.1';
const CREATOR_NAME = 'Pablo Murad';
const CREATOR_EMAIL = 'pablomurad@pm.me';

function getFileExtension(filename) {
  const parts = filename.toLowerCase().split('.');
  if (parts.length < 2) return 'txt';
  return parts[parts.length - 1];
}

function deriveTitle(content, mode) {
  const line = content.split('\n').find((l) => l.trim());
  if (!line) return STR.UNTITLED_DOCUMENT;
  if (mode === MODES.MARKDOWN) {
    const m = line.match(/^#+\s+(.+)$/);
    if (m) return m[1].trim();
  }
  if (mode === MODES.ORG) {
    const m = line.match(/^\*+\s+(.+)$/);
    if (m) return m[1].replace(/^(TODO|DONE)\s+/, '').trim();
  }
  return line.trim().slice(0, 80) || STR.UNTITLED_DOCUMENT;
}

export default function LocalEditorPage() {
  const initialMode = loadMode();
  const [mode, setMode] = useState(initialMode);
  const [content, setContent] = useState(() => loadContent(initialMode));
  const [storageWarning, setStorageWarning] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = persistContent(mode, content);
      setStorageWarning(!saved);
    }, STORAGE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [content, mode]);

  const saveLabel = mode === MODES.ORG ? 'Save .org' : 'Save .md';

  const prefetchMarkdown = useCallback(() => {
    ensureMarkedLoaded();
  }, []);

  const handleModeChange = useCallback(
    (nextMode) => {
      if (nextMode === mode) return;
      persistContent(mode, content);
      persistMode(nextMode);
      setMode(nextMode);
      setContent(loadContent(nextMode));
      setStorageWarning(false);
      if (nextMode === MODES.MARKDOWN) prefetchMarkdown();
      editorRef.current?.focus();
    },
    [mode, content, prefetchMarkdown],
  );

  const handleSave = useCallback(() => {
    const isOrg = mode === MODES.ORG;
    const blob = new Blob([content], {
      type: isOrg ? 'text/plain;charset=utf-8' : 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = isOrg ? 'document.org' : 'document.md';
    link.click();
    URL.revokeObjectURL(url);
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

        if (targetMode !== mode) {
          persistContent(mode, content);
          persistMode(targetMode);
          setMode(targetMode);
          if (targetMode === MODES.MARKDOWN) prefetchMarkdown();
        }

        setContent(result);
        persistContent(targetMode, result);
        setStorageWarning(false);
      };
      reader.readAsText(file);
      event.target.value = '';
    },
    [mode, content, prefetchMarkdown],
  );

  const handleClear = useCallback(() => {
    if (!isDefaultContent(mode, content)) {
      const confirmed = window.confirm(
        'Clear the editor and start a blank document? Current content will be replaced.',
      );
      if (!confirmed) return;
    }

    setContent('');
    persistContent(mode, '');
    setStorageWarning(false);
    editorRef.current?.focus();
  }, [mode, content]);

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

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={deriveTitle(content, mode)}
        mode={mode}
        content={content}
      />
    </div>
  );
}

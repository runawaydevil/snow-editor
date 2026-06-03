import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  MODES,
  isDefaultContent,
  loadContent,
  loadMode,
  persistContent,
  persistMode,
} from './lib/editorConstants.js';
import { buildPreviewHtml, ensureMarkedLoaded } from './lib/previewHtml.js';

const STORAGE_DEBOUNCE_MS = 500;
const APP_VERSION = '0.0.1';
const CREATOR_NAME = 'Pablo Murad';
const CREATOR_EMAIL = 'pablomurad@pm.me';

function countWords(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function getFileExtension(filename) {
  const parts = filename.toLowerCase().split('.');
  if (parts.length < 2) return 'txt';
  return parts[parts.length - 1];
}

function useDividerOrientation() {
  const [orientation, setOrientation] = useState('vertical');

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setOrientation(media.matches ? 'horizontal' : 'vertical');
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return orientation;
}

function App() {
  const initialMode = loadMode();
  const [mode, setMode] = useState(initialMode);
  const [content, setContent] = useState(() => loadContent(initialMode));
  const [storageWarning, setStorageWarning] = useState(false);
  const [markedReady, setMarkedReady] = useState(false);
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const dividerOrientation = useDividerOrientation();

  const deferredContent = useDeferredValue(content);
  const previewIsStale = content !== deferredContent;

  useEffect(() => {
    if (mode !== MODES.MARKDOWN) return;
    let cancelled = false;
    ensureMarkedLoaded().then(() => {
      if (!cancelled) setMarkedReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = persistContent(mode, content);
      setStorageWarning(!saved);
    }, STORAGE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [content, mode]);

  const html = useMemo(() => {
    return buildPreviewHtml(mode, deferredContent);
  }, [mode, deferredContent, markedReady]);

  const wordCount = useMemo(() => countWords(content), [content]);
  const charCount = content.length;

  const saveLabel = mode === MODES.ORG ? 'Save .org' : 'Save .md';

  const prefetchMarkdown = useCallback(() => {
    ensureMarkedLoaded().then(() => setMarkedReady(true));
  }, []);

  const handleModeChange = useCallback(
    (nextMode) => {
      if (nextMode === mode) return;

      persistContent(mode, content);
      persistMode(nextMode);
      setMode(nextMode);
      setContent(loadContent(nextMode));
      setStorageWarning(false);
      if (nextMode === MODES.MARKDOWN) {
        prefetchMarkdown();
      }
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
          if (targetMode === MODES.MARKDOWN) {
            prefetchMarkdown();
          }
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

  const editorAriaLabel =
    mode === MODES.ORG ? 'Org-mode editing area' : 'Markdown editing area';

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-text">
          <h1 className="app-title">Snow Editor</h1>
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
          <button
            type="button"
            className="btn"
            onClick={handleSave}
            aria-label={mode === MODES.ORG ? 'Save as Org-mode file' : 'Save as Markdown file'}
          >
            {saveLabel}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Import file"
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            id="file-import"
            type="file"
            accept=".md,.markdown,.org,.txt,text/markdown,text/plain"
            className="file-input-hidden"
            onChange={handleImport}
            aria-label="Choose file to import"
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleClear}
            aria-label="Clear editor and start blank document"
          >
            Clear
          </button>
        </div>
      </header>

      <main className="app-layout">
        <section
          className="panel panel-editor"
          aria-label={mode === MODES.ORG ? 'Org-mode editor' : 'Markdown editor'}
        >
          <div className="panel-label">Write</div>
          <textarea
            ref={editorRef}
            className="editor"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck="true"
            aria-label={editorAriaLabel}
            placeholder="Start writing..."
          />
        </section>

        <div
          className="layout-divider"
          role="separator"
          aria-orientation={dividerOrientation}
        />

        <section className="panel panel-preview" aria-label="Document preview">
          <div className="panel-label">Read</div>
          <div
            className={`preview-paper${previewIsStale ? ' preview-updating' : ''}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </section>
      </main>

      <footer className="app-footer">
        <div className="app-footer-stats">
          <span>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
          <span className="footer-separator">·</span>
          <span>
            {charCount} {charCount === 1 ? 'character' : 'characters'}
          </span>
        </div>
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
    </div>
  );
}

export default App;

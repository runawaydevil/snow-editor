import {
  lazy,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MODES } from '../lib/editorConstants.js';
import { parseMarkdownHeadings } from '../lib/markdownOutline.js';
import { parseOrgDocument } from '../lib/org/parseDocument.js';
import { buildPreviewHtml, ensureMarkedLoaded, ensureOrgLoaded } from '../lib/previewHtml.js';
import { STR } from '../lib/strings.js';
import DocumentOutline from './DocumentOutline.jsx';

const CodeEditor = lazy(() => import('./CodeEditor.jsx'));

const SPLIT_STORAGE_KEY = 'snow_editor_split';
const SPLIT_MIN = 0.25;
const SPLIT_MAX = 0.75;

function clampSplit(value) {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, value));
}

function loadSplit() {
  try {
    const saved = window.localStorage.getItem(SPLIT_STORAGE_KEY);
    if (saved !== null) return clampSplit(Number.parseFloat(saved));
  } catch {
    /* ignore */
  }
  return 0.5;
}

function persistSplit(value) {
  try {
    window.localStorage.setItem(SPLIT_STORAGE_KEY, String(value));
  } catch {
    /* ignore */
  }
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return mobile;
}

function useWideLayout() {
  const [wide, setWide] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 900px)').matches : true,
  );

  useEffect(() => {
    const media = window.matchMedia('(min-width: 900px)');
    const update = () => setWide(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return wide;
}

export function countWords(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

let hljsPromise = null;
function ensureHighlightLoaded() {
  if (!hljsPromise) {
    // The "common" build ships the ~40 popular languages only.
    hljsPromise = import('highlight.js/lib/common').then((m) => m.default);
  }
  return hljsPromise;
}

export default function EditorLayout({
  mode,
  content,
  onContentChange,
  readOnly = false,
  showEditor = true,
  editorRef,
  previewOnly = false,
}) {
  const [markedReady, setMarkedReady] = useState(false);
  const [orgReady, setOrgReady] = useState(false);
  const [activeTab, setActiveTab] = useState('write');
  const [split, setSplit] = useState(loadSplit);
  const [dragging, setDragging] = useState(false);
  const scrollToLineRef = useRef(null);
  const previewScrollRef = useRef(null);
  const previewContentRef = useRef(null);
  const editorPanelRef = useRef(null);
  const isMobile = useIsMobile();
  const wideLayout = useWideLayout();
  const deferredContent = useDeferredValue(content);
  const previewIsStale = content !== deferredContent;

  useEffect(() => {
    if (mode !== MODES.MARKDOWN) return undefined;
    let cancelled = false;
    ensureMarkedLoaded().then(() => {
      if (!cancelled) setMarkedReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== MODES.ORG) return undefined;
    let cancelled = false;
    ensureOrgLoaded().then(() => {
      if (!cancelled) setOrgReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const orgMeta = useMemo(() => {
    if (mode !== MODES.ORG) return null;
    return parseOrgDocument(deferredContent);
  }, [mode, deferredContent]);

  const headings = useMemo(() => {
    if (mode === MODES.ORG) return orgMeta?.headings ?? [];
    return parseMarkdownHeadings(deferredContent);
  }, [mode, orgMeta, deferredContent]);

  const html = useMemo(() => {
    return buildPreviewHtml(mode, deferredContent);
  }, [mode, deferredContent, markedReady, orgReady]);

  // Lazy syntax highlighting for fenced/SRC code blocks in the preview.
  useEffect(() => {
    const container = previewContentRef.current;
    if (!container || !html || !html.includes('<pre')) return undefined;

    let cancelled = false;
    ensureHighlightLoaded().then((hljs) => {
      if (cancelled || !previewContentRef.current) return;
      const blocks = previewContentRef.current.querySelectorAll('pre code, pre.org-src');
      blocks.forEach((el) => {
        if (el.tagName === 'PRE' && el.querySelector('code')) return;
        if (el.dataset.highlighted === 'yes') return;
        hljs.highlightElement(el);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [html]);

  const handleRegisterScroll = useCallback((scrollFn) => {
    scrollToLineRef.current = scrollFn;
  }, []);

  const handleOutlineSelect = useCallback((line) => {
    scrollToLineRef.current?.(line);
  }, []);

  // Editor → preview proportional scroll sync.
  const handleEditorScrollRatio = useCallback((ratio) => {
    const preview = previewScrollRef.current;
    if (!preview) return;
    const max = preview.scrollHeight - preview.clientHeight;
    if (max > 0) {
      preview.scrollTop = ratio * max;
    }
  }, []);

  // Draggable splitter (desktop only).
  const handleDividerPointerDown = useCallback(
    (event) => {
      if (isMobile) return;
      event.preventDefault();
      setDragging(true);

      const editorPanel = editorPanelRef.current;
      const previewPanel = previewScrollRef.current?.closest('.panel-preview');
      if (!editorPanel || !previewPanel) return;

      const onMove = (moveEvent) => {
        const left = editorPanel.getBoundingClientRect().left;
        const right = previewPanel.getBoundingClientRect().right;
        if (right - left <= 0) return;
        setSplit(clampSplit((moveEvent.clientX - left) / (right - left)));
      };

      const onUp = () => {
        setDragging(false);
        setSplit((value) => {
          persistSplit(value);
          return value;
        });
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [isMobile],
  );

  const handleDividerReset = useCallback(() => {
    setSplit(0.5);
    persistSplit(0.5);
  }, []);

  const wordCount = useMemo(() => countWords(content), [content]);
  const charCount = content.length;

  const editorAriaLabel =
    mode === MODES.ORG ? 'Org-mode editing area' : 'Markdown editing area';

  const splitLayout = showEditor && !previewOnly;
  const useTabs = isMobile && splitLayout;
  const showWrite = splitLayout && (!useTabs || activeTab === 'write');
  const showRead = previewOnly || !useTabs || activeTab === 'read';

  const showOutline =
    splitLayout && !useTabs && wideLayout && headings.length > 0;

  const rendererReady = mode === MODES.ORG ? orgReady : markedReady;
  const contentEmpty = !deferredContent || !deferredContent.trim();

  const gridStyle =
    splitLayout && !useTabs
      ? {
          gridTemplateColumns: showOutline
            ? `10.5rem ${split}fr 2rem ${1 - split}fr`
            : `${split}fr 2rem ${1 - split}fr`,
        }
      : undefined;

  return (
    <>
      {useTabs && (
        <div className="mobile-tabs" role="tablist" aria-label="Editor view">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'write'}
            className={`mobile-tabs__btn${activeTab === 'write' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('write')}
          >
            {STR.TAB_WRITE}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'read'}
            className={`mobile-tabs__btn${activeTab === 'read' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('read')}
          >
            {STR.TAB_READ}
          </button>
        </div>
      )}

      <main
        className={`app-layout${previewOnly ? ' app-layout--preview-only' : ''}${showOutline ? ' app-layout--with-outline' : ''}${useTabs ? ' app-layout--tabs' : ''}${dragging ? ' app-layout--dragging' : ''}`}
        style={gridStyle}
      >
        {showOutline && (
          <DocumentOutline headings={headings} onSelectHeading={handleOutlineSelect} />
        )}

        {showWrite && (
          <>
            <section
              ref={editorPanelRef}
              className="panel panel-editor"
              aria-label={mode === MODES.ORG ? 'Org-mode editor' : 'Markdown editor'}
            >
              <div className="panel-label">{STR.TAB_WRITE}</div>
              <Suspense
                fallback={<div className="editor editor--loading">Loading editor…</div>}
              >
                <CodeEditor
                  mode={mode}
                  value={content}
                  onChange={onContentChange}
                  readOnly={readOnly}
                  editorRef={editorRef}
                  ariaLabel={editorAriaLabel}
                  placeholderText="Start writing..."
                  onRegisterScroll={handleRegisterScroll}
                  onScrollRatio={handleEditorScrollRatio}
                />
              </Suspense>
            </section>

            {!useTabs && (
              <div
                className="layout-divider"
                role="separator"
                aria-orientation="vertical"
                aria-label={STR.RESIZE_PANELS}
                title={STR.RESIZE_PANELS}
                onPointerDown={handleDividerPointerDown}
                onDoubleClick={handleDividerReset}
              />
            )}
          </>
        )}

        {showRead && (
          <section
            className={`panel panel-preview${previewOnly ? ' panel-preview--full' : ''}`}
            aria-label="Document preview"
          >
            <div className="panel-label">{STR.TAB_READ}</div>
            {orgMeta?.title && <p className="org-doc-title">{orgMeta.title}</p>}
            <div
              ref={previewScrollRef}
              className={`preview-paper${previewIsStale ? ' preview-updating' : ''}`}
            >
              {contentEmpty ? (
                <p className="preview-empty">{STR.PREVIEW_EMPTY}</p>
              ) : !rendererReady && !html ? (
                <p className="preview-empty">{STR.PREVIEW_RENDERING}</p>
              ) : (
                <div
                  ref={previewContentRef}
                  className="preview-content"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              )}
            </div>
          </section>
        )}
      </main>

      <div className="app-footer-stats app-footer-stats--inline">
        <span>
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>
        <span className="footer-separator">·</span>
        <span>
          {charCount} {charCount === 1 ? 'character' : 'characters'}
        </span>
      </div>
    </>
  );
}

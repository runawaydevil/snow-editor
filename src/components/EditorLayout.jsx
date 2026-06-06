import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { MODES } from '../lib/editorConstants.js';
import { parseOrgDocument } from '../lib/org/parseDocument.js';
import { buildPreviewHtml, ensureMarkedLoaded, ensureOrgLoaded } from '../lib/previewHtml.js';
import OrgOutline from './OrgOutline.jsx';

const OrgEditor = lazy(() => import('./OrgEditor.jsx'));

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
  const scrollToLineRef = useRef(null);
  const dividerOrientation = useDividerOrientation();
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

  const html = useMemo(() => {
    return buildPreviewHtml(mode, deferredContent);
  }, [mode, deferredContent, markedReady, orgReady]);

  const handleRegisterScroll = useCallback((scrollFn) => {
    scrollToLineRef.current = scrollFn;
  }, []);

  const handleOutlineSelect = useCallback((line) => {
    scrollToLineRef.current?.(line);
  }, []);

  const wordCount = useMemo(() => countWords(content), [content]);
  const charCount = content.length;

  const editorAriaLabel =
    mode === MODES.ORG ? 'Org-mode editing area' : 'Markdown editing area';

  const showOutline =
    mode === MODES.ORG && showEditor && !previewOnly && wideLayout && orgMeta?.headings?.length > 0;

  return (
    <>
      <main
        className={`app-layout${previewOnly ? ' app-layout--preview-only' : ''}${showOutline ? ' app-layout--with-outline' : ''}`}
      >
        {showOutline && (
          <OrgOutline content={content} onSelectHeading={handleOutlineSelect} />
        )}

        {showEditor && !previewOnly && (
          <>
            <section
              className="panel panel-editor"
              aria-label={mode === MODES.ORG ? 'Org-mode editor' : 'Markdown editor'}
            >
              <div className="panel-label">Write</div>
              {mode === MODES.ORG ? (
                <Suspense fallback={<div className="editor editor--loading">Loading Org editor…</div>}>
                  <OrgEditor
                    value={content}
                    onChange={onContentChange}
                    readOnly={readOnly}
                    editorRef={editorRef}
                    ariaLabel={editorAriaLabel}
                    onRegisterScroll={handleRegisterScroll}
                  />
                </Suspense>
              ) : (
                <textarea
                  ref={editorRef}
                  className="editor"
                  value={content}
                  onChange={onContentChange ? (e) => onContentChange(e.target.value) : undefined}
                  readOnly={readOnly}
                  spellCheck="true"
                  aria-label={editorAriaLabel}
                  placeholder="Start writing..."
                />
              )}
            </section>

            <div
              className="layout-divider"
              role="separator"
              aria-orientation={dividerOrientation}
            />
          </>
        )}

        <section
          className={`panel panel-preview${previewOnly ? ' panel-preview--full' : ''}`}
          aria-label="Document preview"
        >
          <div className="panel-label">Read</div>
          {orgMeta?.title && (
            <p className="org-doc-title">{orgMeta.title}</p>
          )}
          <div
            className={`preview-paper${previewIsStale ? ' preview-updating' : ''}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </section>
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

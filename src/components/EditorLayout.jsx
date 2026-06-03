import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { MODES } from '../lib/editorConstants.js';
import { buildPreviewHtml, ensureMarkedLoaded } from '../lib/previewHtml.js';

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

  const html = useMemo(() => {
    return buildPreviewHtml(mode, deferredContent);
  }, [mode, deferredContent, markedReady]);

  const wordCount = useMemo(() => countWords(content), [content]);
  const charCount = content.length;

  const editorAriaLabel =
    mode === MODES.ORG ? 'Org-mode editing area' : 'Markdown editing area';

  return (
    <>
      <main className={`app-layout${previewOnly ? ' app-layout--preview-only' : ''}`}>
        {showEditor && !previewOnly && (
          <>
            <section
              className="panel panel-editor"
              aria-label={mode === MODES.ORG ? 'Org-mode editor' : 'Markdown editor'}
            >
              <div className="panel-label">Write</div>
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

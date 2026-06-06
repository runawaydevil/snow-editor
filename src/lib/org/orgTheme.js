import { EditorView } from '@codemirror/view';

export const orgTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-mono)',
    backgroundColor: 'var(--paper)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'inherit',
  },
  '.cm-content': {
    caretColor: 'var(--accent-hover)',
    padding: '0.75rem 0.5rem',
    minHeight: '100%',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--snow)',
    borderRight: '1px solid var(--border-soft)',
    color: 'var(--text-muted)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(122, 155, 184, 0.08)',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--accent-hover)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'rgba(122, 155, 184, 0.2) !important',
  },
  '.cm-line': {
    lineHeight: '1.55',
  },
});

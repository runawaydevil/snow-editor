import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Syntax colors for the Markdown editor, tuned to the snow palette.
// Kept in JS (CodeMirror HighlightStyle) but pointing at CSS variables where
// possible so dark mode follows the stylesheet.
const markdownHighlightStyle = HighlightStyle.define([
  {
    tag: tags.heading1,
    fontWeight: '700',
    fontSize: '1.25em',
    color: 'var(--text-heading)',
  },
  {
    tag: tags.heading2,
    fontWeight: '700',
    fontSize: '1.15em',
    color: 'var(--text-heading)',
  },
  {
    tag: tags.heading3,
    fontWeight: '600',
    fontSize: '1.05em',
    color: 'var(--text-heading)',
  },
  { tag: tags.heading4, fontWeight: '600', color: 'var(--text-heading)' },
  { tag: tags.heading5, fontWeight: '600', color: 'var(--text-heading)' },
  { tag: tags.heading6, fontWeight: '600', color: 'var(--text-heading)' },
  { tag: tags.strong, fontWeight: '700', color: 'var(--text-heading)' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.monospace, color: 'var(--accent-hover)' },
  { tag: tags.link, color: 'var(--accent-hover)' },
  { tag: tags.url, color: 'var(--accent)' },
  { tag: tags.quote, color: 'var(--text-muted)', fontStyle: 'italic' },
  { tag: tags.contentSeparator, color: 'var(--accent)' },
  { tag: tags.meta, color: 'var(--text-muted)' },
  { tag: tags.processingInstruction, color: 'var(--accent)' },
  { tag: tags.labelName, color: 'var(--accent-hover)' },
]);

export const markdownHighlight = syntaxHighlighting(markdownHighlightStyle);

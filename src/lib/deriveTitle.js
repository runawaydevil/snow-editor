import { MODES } from './editorConstants.js';
import { STR } from './strings.js';

// First meaningful line of the document, used for draft names and filenames.
export function deriveTitle(content, mode) {
  const line = (content ?? '').split('\n').find((l) => l.trim());
  if (!line) return STR.UNTITLED_DOCUMENT;
  if (mode === MODES.MARKDOWN) {
    const m = line.match(/^#+\s+(.+)$/);
    if (m) return m[1].trim();
  }
  if (mode === MODES.ORG) {
    const title = line.match(/^#\+TITLE:\s*(.+)$/i);
    if (title) return title[1].trim();
    const m = line.match(/^\*+\s+(.+)$/);
    if (m) return m[1].replace(/^(TODO|DONE)\s+/, '').trim();
  }
  return line.trim().slice(0, 80) || STR.UNTITLED_DOCUMENT;
}

import { MODES } from './editorConstants.js';

// Strip Windows-illegal filename characters; collapse whitespace runs.
const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|]/g;

function sanitizeFilenameBase(name) {
  const cleaned = (name ?? '')
    .replace(ILLEGAL_FILENAME_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
    .replace(/[. ]+$/, '');
  return cleaned || 'document';
}

export function downloadDocument(content, mode, filenameBase = 'document') {
  const isOrg = mode === MODES.ORG;
  const blob = new Blob([content], {
    type: isOrg ? 'text/plain;charset=utf-8' : 'text/markdown;charset=utf-8',
  });
  const base = sanitizeFilenameBase(filenameBase);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = isOrg ? `${base}.org` : `${base}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

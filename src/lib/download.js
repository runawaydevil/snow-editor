import { MODES } from './editorConstants.js';

export function downloadDocument(content, mode, filenameBase = 'document') {
  const isOrg = mode === MODES.ORG;
  const blob = new Blob([content], {
    type: isOrg ? 'text/plain;charset=utf-8' : 'text/markdown;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = isOrg ? `${filenameBase}.org` : `${filenameBase}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

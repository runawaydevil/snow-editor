import DOMPurify from 'dompurify';
import { MODES } from './editorConstants.js';
import { parseOrgMode } from './parseOrgMode.js';

const SANITIZE_OPTIONS = { ADD_ATTR: ['class', 'rel'] };

let markedParser = null;
let markedLoadPromise = null;

export function ensureMarkedLoaded() {
  if (markedParser) {
    return Promise.resolve(markedParser);
  }
  if (!markedLoadPromise) {
    markedLoadPromise = import('marked').then((module) => {
      markedParser = module.marked;
      return markedParser;
    });
  }
  return markedLoadPromise;
}

export function buildPreviewHtml(mode, content) {
  if (!content || !content.trim()) {
    return '';
  }

  if (mode === MODES.ORG) {
    return DOMPurify.sanitize(parseOrgMode(content), SANITIZE_OPTIONS);
  }

  if (!markedParser) {
    return '';
  }

  const rawHtml = markedParser.parse(content, { gfm: true, breaks: true });
  return DOMPurify.sanitize(rawHtml, SANITIZE_OPTIONS);
}

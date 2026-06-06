import DOMPurify from 'dompurify';
import { MODES } from './editorConstants.js';

const MARKDOWN_SANITIZE_OPTIONS = { ADD_ATTR: ['class', 'rel'] };

let markedParser = null;
let markedLoadPromise = null;
let orgToHtmlSync = null;
let orgLoadPromise = null;

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

export function ensureOrgLoaded() {
  if (orgToHtmlSync) {
    return Promise.resolve(orgToHtmlSync);
  }
  if (!orgLoadPromise) {
    orgLoadPromise = import('./org/pipeline.js').then((module) => {
      orgToHtmlSync = module.orgToHtmlSync;
      return orgToHtmlSync;
    });
  }
  return orgLoadPromise;
}

export function buildPreviewHtml(mode, content) {
  if (!content || !content.trim()) {
    return '';
  }

  if (mode === MODES.ORG) {
    if (!orgToHtmlSync) return '';
    return orgToHtmlSync(content);
  }

  if (!markedParser) {
    return '';
  }

  const rawHtml = markedParser.parse(content, { gfm: true, breaks: true });
  return DOMPurify.sanitize(rawHtml, MARKDOWN_SANITIZE_OPTIONS);
}

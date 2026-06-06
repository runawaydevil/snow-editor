import { unified } from 'unified';
import reorgParse from '@orgajs/reorg-parse';
import reorgRehype from '@orgajs/reorg-rehype';
import rehypeStringify from 'rehype-stringify';
import { enhanceOrgHtml } from './enhanceHtml.js';
import { normalizeOrgContent } from './normalize.js';
import { sanitizeOrgHtml } from './sanitize.js';

let processor = null;

function getProcessor() {
  if (!processor) {
    processor = unified()
      .use(reorgParse)
      .use(reorgRehype)
      .use(rehypeStringify);
  }
  return processor;
}

function processOrg(content) {
  return getProcessor().processSync(normalizeOrgContent(content)).toString();
}

export function orgToHtmlSync(content) {
  if (!content || !content.trim()) return '';
  const raw = enhanceOrgHtml(processOrg(content));
  return sanitizeOrgHtml(raw);
}

export function orgToRawHtmlSync(content) {
  if (!content || !content.trim()) return '';
  return processOrg(content);
}

import DOMPurify from 'dompurify';
import { ORG_SANITIZE_OPTIONS } from './constants.js';

export function sanitizeOrgHtml(html) {
  if (!html) return '';
  if (typeof window === 'undefined' || !window.document) {
    return html;
  }
  return DOMPurify.sanitize(html, ORG_SANITIZE_OPTIONS);
}

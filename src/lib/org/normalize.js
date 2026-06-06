export function normalizeOrgContent(content) {
  if (!content) return '';
  return content.replace(/\r\n/g, '\n');
}

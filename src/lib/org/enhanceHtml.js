export function enhanceOrgHtml(html) {
  if (!html) return '';

  let result = html;

  result = result.replace(/<table(?![^>]*class=)/g, '<table class="org-table"');
  result = result.replace(/<h([1-6])(?![^>]*class=)/g, '<h$1 class="org-heading org-heading--$1"');
  result = result.replace(
    /<blockquote(?![^>]*class=)/g,
    '<blockquote class="org-quote"',
  );
  result = result.replace(/<pre(?![^>]*class=)/g, '<pre class="org-src"');
  result = result.replace(
    /<div class="section"/g,
    '<div class="org-section"',
  );

  return result;
}

const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const FENCE_RE = /^(```|~~~)/;

// Cheap line-based heading scan for the Markdown outline.
// Skips fenced code blocks so commented "# lines" inside code don't show up.
export function parseMarkdownHeadings(content) {
  if (!content?.trim()) return [];

  const headings = [];
  let inFence = false;

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (FENCE_RE.test(line.trimStart())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = line.match(HEADING_RE);
    if (match) {
      headings.push({
        level: match[1].length,
        title: match[2].replace(/\s+#+\s*$/, '').trim(),
        todo: null,
        line: i + 1,
      });
    }
  }

  return headings;
}

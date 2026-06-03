function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeHref(url) {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return null;
}

function sanitizeLanguage(language) {
  const trimmed = language.trim();
  if (!trimmed) return 'text';
  if (/^[a-zA-Z0-9#+.-]+$/.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return 'text';
}

function parseOrgInline(text) {
  const placeholders = [];
  let working = escapeHtml(text);

  const stash = (html) => {
    const key = `\x00ORG${placeholders.length}PH\x00`;
    placeholders.push(html);
    return key;
  };

  working = working.replace(
    /\[\[([^\]]+)\]\[([^\]]+)\]\]/g,
    (_, url, label) => {
      const href = sanitizeHref(url);
      if (!href) return escapeHtml(`[[${url}][${label}]]`);
      return stash(
        `<a href="${href}" rel="noopener noreferrer">${escapeHtml(label)}</a>`,
      );
    },
  );

  working = working.replace(/\[\[([^\]]+)\]\]/g, (_, url) => {
    const href = sanitizeHref(url);
    if (!href) return escapeHtml(`[[${url}]]`);
    return stash(`<a href="${href}" rel="noopener noreferrer">${href}</a>`);
  });

  working = working.replace(/~([^~]+)~/g, (_, code) => `<code>${code}</code>`);
  working = working.replace(/=([^=]+)=/g, (_, code) => `<code>${code}</code>`);
  working = working.replace(/\*([^*]+)\*/g, (_, bold) => `<strong>${bold}</strong>`);
  working = working.replace(/\/([^/]+)\//g, (_, italic) => `<em>${italic}</em>`);

  placeholders.forEach((html, index) => {
    working = working.replace(`\x00ORG${index}PH\x00`, html);
  });

  return working;
}

function parseHeading(line) {
  const match = line.match(/^(\*{1,4})\s+(?:(TODO|DONE)\s+)?(.+)$/);
  if (!match) return null;

  const level = Math.min(match[1].length, 4);
  const keyword = match[2];
  const title = match[3].trim();
  const tag = `h${level}`;

  let badge = '';
  if (keyword === 'TODO') {
    badge = '<span class="org-badge org-todo">TODO</span> ';
  } else if (keyword === 'DONE') {
    badge = '<span class="org-badge org-done">DONE</span> ';
  }

  return `<${tag}>${badge}${parseOrgInline(title)}</${tag}>`;
}

function parseListBlock(lines) {
  const items = lines
    .filter((line) => /^[-+]\s+/.test(line))
    .map((line) => `<li>${parseOrgInline(line.replace(/^[-+]\s+/, ''))}</li>`);

  if (items.length === 0) return '';
  return `<ul>${items.join('')}</ul>`;
}

function parseParagraphBlock(lines) {
  const html = lines.map((line) => parseOrgInline(line)).join('<br>');
  return `<p>${html}</p>`;
}

function extractSpecialBlocks(input) {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const srcMatch = lines[i].match(/^#\+BEGIN_SRC\s*(\S*)?\s*$/i);
    const quoteMatch = lines[i].match(/^#\+BEGIN_QUOTE\s*$/i);

    if (srcMatch) {
      const language = sanitizeLanguage((srcMatch[1] || '').trim());
      const codeLines = [];
      i += 1;
      while (i < lines.length && !/^#\+END_SRC\s*$/i.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      const langClass = ` class="language-${language}"`;
      blocks.push({
        type: 'html',
        html: `<pre><code${langClass}>${escapeHtml(codeLines.join('\n'))}</code></pre>`,
      });
      continue;
    }

    if (quoteMatch) {
      const quoteLines = [];
      i += 1;
      while (i < lines.length && !/^#\+END_QUOTE\s*$/i.test(lines[i])) {
        quoteLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      const inner =
        quoteLines.length === 0
          ? ''
          : quoteLines.map((l) => parseOrgInline(l)).join('<br>');
      blocks.push({
        type: 'html',
        html: `<blockquote>${inner}</blockquote>`,
      });
      continue;
    }

    const textLines = [];
    while (
      i < lines.length &&
      !/^#\+BEGIN_SRC/i.test(lines[i]) &&
      !/^#\+BEGIN_QUOTE/i.test(lines[i])
    ) {
      textLines.push(lines[i]);
      i += 1;
    }

    if (textLines.length > 0) {
      blocks.push({ type: 'text', lines: textLines });
    }
  }

  return blocks;
}

function parseTextBlock(lines) {
  const chunks = [];
  let current = [];

  const flush = () => {
    if (current.length === 0) return;
    chunks.push([...current]);
    current = [];
  };

  for (const line of lines) {
    if (line.trim() === '') {
      flush();
    } else {
      current.push(line);
    }
  }
  flush();

  return chunks
    .map((chunk) => {
      if (chunk.every((line) => /^[-+]\s+/.test(line))) {
        return parseListBlock(chunk);
      }
      if (chunk.length === 1) {
        const heading = parseHeading(chunk[0]);
        if (heading) return heading;
        if (/^[-+]\s+/.test(chunk[0])) return parseListBlock(chunk);
      }
      const heading = parseHeading(chunk[0]);
      if (heading) {
        return heading + (chunk.length > 1 ? parseParagraphBlock(chunk.slice(1)) : '');
      }
      return parseParagraphBlock(chunk);
    })
    .join('');
}

export function parseOrgMode(input) {
  if (!input || !input.trim()) {
    return '';
  }

  const blocks = extractSpecialBlocks(input);
  const htmlParts = [];

  for (const block of blocks) {
    if (block.type === 'html') {
      htmlParts.push(block.html);
    } else {
      htmlParts.push(parseTextBlock(block.lines));
    }
  }

  return htmlParts.join('');
}

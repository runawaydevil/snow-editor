const CHECKLIST_RE = /^(\s*)([-+*])\s+\[([ Xx\-])\](.*)$/;
const HEADING_RE = /^(\*+)\s+(.*)$/;

export function isChecklistLine(line) {
  return CHECKLIST_RE.test(line);
}

export function toggleChecklistLine(line) {
  const match = line.match(CHECKLIST_RE);
  if (!match) return line;

  const [, indent, bullet, state, rest] = match;
  const nextState = state === 'X' || state === 'x' ? ' ' : 'X';
  return `${indent}${bullet} [${nextState}]${rest}`;
}

export function adjustHeading(line, delta) {
  const match = line.match(HEADING_RE);
  if (!match) return line;

  const nextLevel = match[1].length + delta;
  if (nextLevel < 1 || nextLevel > 8) return line;
  return `${'*'.repeat(nextLevel)} ${match[2]}`;
}

export function isHeadingLine(line) {
  return HEADING_RE.test(line);
}

export function insertNewListItem(line) {
  const checklist = line.match(/^(\s*)([-+*])\s+\[[ Xx\-]\](.*)$/);
  if (checklist) {
    return `${checklist[1]}${checklist[2]} [ ]`;
  }

  const list = line.match(/^(\s*)([-+*]|\d+\.)\s+(.*)$/);
  if (list) {
    const bullet = list[2].endsWith('.') ? list[2] : list[2];
    return `${list[1]}${bullet} `;
  }

  if (isHeadingLine(line)) {
    return '- ';
  }

  return '- ';
}

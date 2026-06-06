import { keymap } from '@codemirror/view';
import { insertNewlineAndIndent } from '@codemirror/commands';
import {
  adjustHeading,
  insertNewListItem,
  isChecklistLine,
  isHeadingLine,
} from './editorUtils.js';

function promoteHeading(view) {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  if (!isHeadingLine(line.text)) return false;
  const next = adjustHeading(line.text, -1);
  if (next === line.text) return false;
  view.dispatch({ changes: { from: line.from, to: line.to, insert: next } });
  return true;
}

function demoteHeading(view) {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  if (!isHeadingLine(line.text)) return false;
  const next = adjustHeading(line.text, 1);
  if (next === line.text) return false;
  view.dispatch({ changes: { from: line.from, to: line.to, insert: next } });
  return true;
}

function continueListItem(view) {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const prefix = insertNewListItem(line.text);
  view.dispatch({
    changes: { from: line.to, insert: `\n${prefix}` },
    selection: { anchor: line.to + 1 + prefix.length },
  });
  return true;
}

function indentListLine(view) {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  if (!/^(\s*)([-+*]|\d+\.)\s+/.test(line.text) && !isChecklistLine(line.text)) {
    return false;
  }
  view.dispatch({
    changes: { from: line.from, to: line.from, insert: '  ' },
    selection: { anchor: view.state.selection.main.head + 2 },
  });
  return true;
}

function handleTab(view) {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  if (isHeadingLine(line.text)) {
    return demoteHeading(view);
  }
  if (indentListLine(view)) return true;
  return insertNewlineAndIndent(view);
}

function handleShiftTab(view) {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  if (isHeadingLine(line.text)) {
    return promoteHeading(view);
  }
  if (isChecklistLine(line.text) || /^(\s*)([-+*]|\d+\.)\s+/.test(line.text)) {
    const match = line.text.match(/^(\s*)/);
    const indent = match?.[1] ?? '';
    if (indent.length >= 2) {
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: line.text.slice(2) },
      });
      return true;
    }
  }
  return false;
}

export const orgKeymap = keymap.of([
  { key: 'Tab', run: handleTab },
  { key: 'Shift-Tab', run: handleShiftTab },
  { key: 'Mod-Enter', run: continueListItem },
]);

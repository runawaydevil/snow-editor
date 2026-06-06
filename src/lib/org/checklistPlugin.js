import { ViewPlugin } from '@codemirror/view';
import { toggleChecklistLine, isChecklistLine } from './editorUtils.js';

export function checklistPlugin(getReadOnly) {
  return ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.view = view;
        this.getReadOnly = getReadOnly;
        this.onMouseDown = this.onMouseDown.bind(this);
        view.dom.addEventListener('mousedown', this.onMouseDown);
      }

      onMouseDown(event) {
        if (this.getReadOnly()) return;

        const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos == null) return;

        const line = this.view.state.doc.lineAt(pos);
        if (!isChecklistLine(line.text)) return;

        const bracketStart = line.text.indexOf('[');
        const bracketEnd = line.text.indexOf(']', bracketStart);
        if (bracketStart < 0 || bracketEnd < 0) return;

        const clickStart = pos - line.from;
        if (clickStart < bracketStart || clickStart > bracketEnd + 1) return;

        event.preventDefault();
        const nextLine = toggleChecklistLine(line.text);
        this.view.dispatch({
          changes: { from: line.from, to: line.to, insert: nextLine },
        });
      }

      destroy() {
        this.view.dom.removeEventListener('mousedown', this.onMouseDown);
      }
    },
  );
}

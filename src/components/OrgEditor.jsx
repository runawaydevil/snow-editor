import { Compartment, EditorState } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { org } from '@orgajs/cm-lang';
import { useEffect, useRef } from 'react';
import { checklistPlugin } from '../lib/org/checklistPlugin.js';
import { orgKeymap } from '../lib/org/keymap.js';
import { orgTheme } from '../lib/org/orgTheme.js';

export default function OrgEditor({
  value,
  onChange,
  readOnly = false,
  editorRef,
  ariaLabel,
  onRegisterScroll,
}) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const readOnlyRef = useRef(readOnly);
  const onChangeRef = useRef(onChange);
  const editableCompartment = useRef(new Compartment());

  readOnlyRef.current = readOnly;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && onChangeRef.current) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        org(),
        orgTheme,
        lineNumbers(),
        highlightActiveLine(),
        drawSelection(),
        editableCompartment.current.of(EditorView.editable.of(!readOnlyRef.current)),
        EditorState.readOnly.of(readOnlyRef.current),
        EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
        updateListener,
        checklistPlugin(() => readOnlyRef.current),
        orgKeymap,
        keymap.of([...defaultKeymap, indentWithTab]),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    if (editorRef) {
      editorRef.current = {
        focus: () => view.focus(),
        getView: () => view,
      };
    }

    onRegisterScroll?.((lineNumber) => {
      const line = view.state.doc.line(
        Math.min(Math.max(1, lineNumber), view.state.doc.lines),
      );
      view.dispatch({
        effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
        selection: { anchor: line.from },
      });
      view.focus();
    });

    return () => {
      view.destroy();
      viewRef.current = null;
      if (editorRef) editorRef.current = null;
    };
  }, [ariaLabel, editorRef, onRegisterScroll]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: editableCompartment.current.reconfigure(
        EditorView.editable.of(!readOnly),
      ),
    });
  }, [readOnly]);

  return <div ref={containerRef} className="org-editor cm-host" />;
}

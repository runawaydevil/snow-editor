import { Compartment, EditorState } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { org } from '@orgajs/cm-lang';
import { useEffect, useRef } from 'react';
import { MODES } from '../lib/editorConstants.js';
import { markdownHighlight } from '../lib/markdownHighlight.js';
import { checklistPlugin } from '../lib/org/checklistPlugin.js';
import { orgKeymap } from '../lib/org/keymap.js';
import { orgTheme } from '../lib/org/orgTheme.js';

function languageExtensions(mode) {
  if (mode === MODES.ORG) {
    return [org(), orgKeymap];
  }
  return [markdown(), markdownHighlight];
}

export default function CodeEditor({
  mode = MODES.MARKDOWN,
  value,
  onChange,
  readOnly = false,
  editorRef,
  ariaLabel,
  placeholderText,
  onRegisterScroll,
  onScrollRatio,
}) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const readOnlyRef = useRef(readOnly);
  const onChangeRef = useRef(onChange);
  const onScrollRatioRef = useRef(onScrollRatio);
  const editableCompartment = useRef(new Compartment());

  readOnlyRef.current = readOnly;
  onChangeRef.current = onChange;
  onScrollRatioRef.current = onScrollRatio;

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
        ...languageExtensions(mode),
        orgTheme,
        lineNumbers(),
        highlightActiveLine(),
        drawSelection(),
        editableCompartment.current.of(EditorView.editable.of(!readOnlyRef.current)),
        EditorState.readOnly.of(readOnlyRef.current),
        EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
        updateListener,
        checklistPlugin(() => readOnlyRef.current),
        placeholderText ? placeholder(placeholderText) : [],
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

    // Proportional scroll position for editor → preview sync.
    let scrollFrame = null;
    const scroller = view.scrollDOM;
    const handleScroll = () => {
      if (!onScrollRatioRef.current || scrollFrame != null) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = null;
        const max = scroller.scrollHeight - scroller.clientHeight;
        if (max > 0) {
          onScrollRatioRef.current(scroller.scrollTop / max);
        }
      });
    };
    scroller.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scroller.removeEventListener('scroll', handleScroll);
      if (scrollFrame != null) window.cancelAnimationFrame(scrollFrame);
      view.destroy();
      viewRef.current = null;
      if (editorRef) editorRef.current = null;
    };
  }, [mode, ariaLabel, editorRef, onRegisterScroll, placeholderText]);

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

  return <div ref={containerRef} className="code-editor cm-host" />;
}

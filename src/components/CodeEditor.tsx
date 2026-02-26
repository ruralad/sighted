import { useRef, useEffect, useCallback } from "react";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { go } from "@codemirror/lang-go";
import { oneDark } from "@codemirror/theme-one-dark";
import { indentWithTab } from "@codemirror/commands";
import type { Language } from "../types/question";

function getLangExtension(lang: Language) {
  switch (lang) {
    case "javascript":
      return javascript();
    case "python":
      return python();
    case "go":
      return go();
  }
}

interface CodeEditorProps {
  language: Language;
  initialCode: string;
  onCodeChange: (code: string) => void;
  onRun: () => void;
}

export function CodeEditor({
  language,
  initialCode,
  onCodeChange,
  onRun,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

  const createEditor = useCallback(
    (doc: string) => {
      if (!containerRef.current) return;

      if (viewRef.current) {
        viewRef.current.destroy();
      }

      const state = EditorState.create({
        doc,
        extensions: [
          basicSetup,
          getLangExtension(language),
          oneDark,
          keymap.of([
            indentWithTab,
            {
              key: "Ctrl-Enter",
              mac: "Cmd-Enter",
              run: () => {
                onRunRef.current();
                return true;
              },
            },
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onCodeChange(update.state.doc.toString());
            }
          }),
          EditorView.theme({
            "&": { height: "100%", fontSize: "14px" },
            ".cm-scroller": { overflow: "auto" },
            ".cm-content": { fontFamily: "var(--font-mono)" },
            ".cm-gutters": {
              backgroundColor: "#1e1e3f",
              borderRight: "1px solid var(--border)",
            },
          }),
        ],
      });

      viewRef.current = new EditorView({
        state,
        parent: containerRef.current,
      });
    },
    [language, onCodeChange],
  );

  useEffect(() => {
    createEditor(initialCode);
    return () => {
      viewRef.current?.destroy();
    };
  }, [initialCode, createEditor]);

  return <div ref={containerRef} className="code-editor" />;
}

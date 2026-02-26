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
import type { ThemeMode } from "../store/themeStore";

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

// CM6 themes require hardcoded values — they don't resolve CSS variables at runtime.
// We read the computed CSS vars once at editor creation and bake them into the theme.
function readCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function buildEditorTheme(mode: ThemeMode) {
  const bg = readCSSVar("--cm-bg");
  const gutterBg = readCSSVar("--cm-gutter-bg");
  const gutterBorder = readCSSVar("--cm-gutter-border");
  const gutterText = readCSSVar("--cm-gutter-text");
  const activeLineBg = readCSSVar("--cm-active-line-bg");
  const activeGutterBg = readCSSVar("--cm-active-gutter-bg");
  const selectionBg = readCSSVar("--cm-selection-bg");
  const accent = readCSSVar("--accent");
  const text = readCSSVar("--text");

  return EditorView.theme(
    {
      "&": {
        height: "100%",
        fontSize: "13px",
        backgroundColor: bg,
        color: text,
      },
      ".cm-scroller": { overflow: "auto" },
      ".cm-content": {
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        lineHeight: "1.7",
        caretColor: accent,
      },
      ".cm-gutters": {
        backgroundColor: gutterBg,
        borderRight: `1px solid ${gutterBorder}`,
        color: gutterText,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "11px",
      },
      ".cm-activeLineGutter": {
        backgroundColor: activeGutterBg,
        color: accent,
      },
      ".cm-activeLine": {
        backgroundColor: activeLineBg,
      },
      ".cm-cursor": {
        borderLeftColor: accent,
      },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
        backgroundColor: `${selectionBg} !important`,
      },
    },
    { dark: mode === "dark" },
  );
}

interface CodeEditorProps {
  language: Language;
  initialCode: string;
  themeMode: ThemeMode;
  onCodeChange: (code: string) => void;
  onRun: () => void;
}

export function CodeEditor({
  language,
  initialCode,
  themeMode,
  onCodeChange,
  onRun,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Ref keeps the latest onRun without adding it to CM keymap dependencies
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

  const createEditor = useCallback(
    (doc: string) => {
      if (!containerRef.current) return;

      if (viewRef.current) {
        viewRef.current.destroy();
      }

      // Dark mode layers oneDark as a base, then overrides with our CSS-var theme.
      // Light mode only uses our custom theme (no base needed).
      const themeExtensions =
        themeMode === "dark"
          ? [oneDark, buildEditorTheme("dark")]
          : [buildEditorTheme("light")];

      const state = EditorState.create({
        doc,
        extensions: [
          basicSetup,
          getLangExtension(language),
          ...themeExtensions,
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
        ],
      });

      viewRef.current = new EditorView({
        state,
        parent: containerRef.current,
      });
    },
    [language, themeMode, onCodeChange],
  );

  useEffect(() => {
    createEditor(initialCode);
    return () => {
      viewRef.current?.destroy();
    };
  }, [initialCode, createEditor]);

  return <div ref={containerRef} className="code-editor" />;
}

import { useRef, useEffect, useCallback } from "react";
import {
  EditorView,
  keymap,
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine as highlightActiveLineExt,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  lineNumbers as lineNumbersExt,
  highlightActiveLineGutter,
  scrollPastEnd as scrollPastEndExt,
} from "@codemirror/view";
import { EditorState, type Extension } from "@codemirror/state";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
  indentOnInput,
  bracketMatching as bracketMatchingExt,
  foldGutter as foldGutterExt,
  foldKeymap,
  indentUnit,
} from "@codemirror/language";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  searchKeymap,
  highlightSelectionMatches as highlightSelectionMatchesExt,
} from "@codemirror/search";
import {
  autocompletion as autocompletionExt,
  completionKeymap,
  closeBrackets as closeBracketsExt,
  closeBracketsKeymap,
} from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  dracula,
  githubDark,
  githubLight,
  gruvboxDark,
  gruvboxLight,
  materialDark,
  materialLight,
  monokai,
  monokaiDimmed,
  nord,
  solarizedDark,
  solarizedLight,
  sublime,
  tokyoNight,
  tokyoNightDay,
  tokyoNightStorm,
  vscodeDark,
  vscodeLight,
  xcodeDark,
  xcodeLight,
  androidstudio,
  atomone,
  aura,
  bbedit,
  bespin,
  copilot,
  darcula,
  eclipse,
  okaidia,
} from "@uiw/codemirror-themes-all";
import type { Language } from "../types/question";
import type { ThemeMode } from "../store/themeStore";
import type { EditorSettings, EditorThemeId } from "../store/editorStore";

function getLangExtension(lang: Language) {
  switch (lang) {
    case "javascript":
      return javascript();
    case "python":
      return python();
    case "go":
      return go();
    case "java":
      return java();
    default:
      return javascript();
  }
}

// Maps theme IDs to their CM6 extension. Returns null for "auto" (handled separately).
function resolveThemeExtension(id: EditorThemeId): Extension | null {
  switch (id) {
    case "auto": return null;
    case "oneDark": return oneDark;
    case "dracula": return dracula;
    case "githubDark": return githubDark;
    case "githubLight": return githubLight;
    case "gruvboxDark": return gruvboxDark;
    case "gruvboxLight": return gruvboxLight;
    case "materialDark": return materialDark;
    case "materialLight": return materialLight;
    case "monokai": return monokai;
    case "monokaiDimmed": return monokaiDimmed;
    case "nord": return nord;
    case "solarizedDark": return solarizedDark;
    case "solarizedLight": return solarizedLight;
    case "sublime": return sublime;
    case "tokyoNight": return tokyoNight;
    case "tokyoNightDay": return tokyoNightDay;
    case "tokyoNightStorm": return tokyoNightStorm;
    case "vscodeDark": return vscodeDark;
    case "vscodeLight": return vscodeLight;
    case "xcodeDark": return xcodeDark;
    case "xcodeLight": return xcodeLight;
    case "androidstudio": return androidstudio;
    case "atomone": return atomone;
    case "aura": return aura;
    case "bbedit": return bbedit;
    case "bespin": return bespin;
    case "copilot": return copilot;
    case "darcula": return darcula;
    case "eclipse": return eclipse;
    case "okaidia": return okaidia;
  }
}

// CM6 themes require hardcoded values — they don't resolve CSS variables at runtime.
// We read the computed CSS vars once at editor creation and bake them into the theme.
function readCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Builds a theme that follows the app's palette CSS variables.
// Used only in "auto" mode — third-party themes provide their own colors.
function buildAutoTheme(mode: ThemeMode, settings: EditorSettings) {
  const bg = readCSSVar("--cm-bg");
  const gutterBg = readCSSVar("--cm-gutter-bg");
  const gutterBorder = readCSSVar("--cm-gutter-border");
  const gutterText = readCSSVar("--cm-gutter-text");
  const activeLineBg = readCSSVar("--cm-active-line-bg");
  const activeGutterBg = readCSSVar("--cm-active-gutter-bg");
  const selectionBg = readCSSVar("--cm-selection-bg");
  const accent = readCSSVar("--accent");
  const text = readCSSVar("--text");

  const fontStack = settings.fontFamily === "monospace"
    ? "monospace"
    : `'${settings.fontFamily}', monospace`;

  const gutterFontSize = Math.max(settings.fontSize - 2, 9);

  return EditorView.theme(
    {
      "&": {
        height: "100%",
        fontSize: `${settings.fontSize}px`,
        backgroundColor: bg,
        color: text,
      },
      ".cm-scroller": { overflow: "auto" },
      ".cm-content": {
        fontFamily: fontStack,
        lineHeight: String(settings.lineHeight),
        caretColor: accent,
      },
      ".cm-gutters": {
        backgroundColor: gutterBg,
        borderRight: `1px solid ${gutterBorder}`,
        color: gutterText,
        fontFamily: fontStack,
        fontSize: `${gutterFontSize}px`,
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

// Thin overlay that applies font/sizing on top of any third-party theme
function buildTypographyOverlay(settings: EditorSettings) {
  const fontStack = settings.fontFamily === "monospace"
    ? "monospace"
    : `'${settings.fontFamily}', monospace`;

  const gutterFontSize = Math.max(settings.fontSize - 2, 9);

  return EditorView.theme({
    "&": {
      height: "100%",
      fontSize: `${settings.fontSize}px`,
    },
    ".cm-scroller": { overflow: "auto" },
    ".cm-content": {
      fontFamily: fontStack,
      lineHeight: String(settings.lineHeight),
    },
    ".cm-gutters": {
      fontFamily: fontStack,
      fontSize: `${gutterFontSize}px`,
    },
  });
}

function buildExtensions(settings: EditorSettings): Extension[] {
  const exts: Extension[] = [];

  if (settings.lineNumbers) exts.push(lineNumbersExt());
  if (settings.foldGutter) exts.push(foldGutterExt());

  exts.push(highlightSpecialChars());
  exts.push(history());
  exts.push(drawSelection());
  exts.push(dropCursor());
  exts.push(EditorState.allowMultipleSelections.of(true));
  exts.push(indentOnInput());
  exts.push(syntaxHighlighting(defaultHighlightStyle, { fallback: true }));

  if (settings.bracketMatching) exts.push(bracketMatchingExt());
  if (settings.closeBrackets) exts.push(closeBracketsExt());
  if (settings.autocompletion) exts.push(autocompletionExt());

  exts.push(rectangularSelection());
  exts.push(crosshairCursor());

  if (settings.highlightActiveLine) {
    exts.push(highlightActiveLineExt());
    exts.push(highlightActiveLineGutter());
  }

  if (settings.highlightSelectionMatches) exts.push(highlightSelectionMatchesExt());
  if (settings.lineWrapping) exts.push(EditorView.lineWrapping);
  if (settings.scrollPastEnd) exts.push(scrollPastEndExt());

  exts.push(EditorState.tabSize.of(settings.tabSize));

  const indent = settings.indentWithTabs
    ? "\t"
    : " ".repeat(settings.tabSize);
  exts.push(indentUnit.of(indent));

  const keymaps = [
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
  ];
  if (settings.indentWithTabs) keymaps.push(indentWithTab);

  exts.push(keymap.of(keymaps));

  return exts;
}

function buildThemeExtensions(themeMode: ThemeMode, settings: EditorSettings): Extension[] {
  const themeExt = resolveThemeExtension(settings.editorTheme);

  if (themeExt) {
    // Third-party theme owns colors; we only overlay font/sizing
    return [themeExt, buildTypographyOverlay(settings)];
  }

  // "auto" mode: palette-aware theme that follows the app's CSS variables
  return themeMode === "dark"
    ? [oneDark, buildAutoTheme("dark", settings)]
    : [buildAutoTheme("light", settings)];
}

interface CodeEditorProps {
  language: Language;
  initialCode: string;
  themeMode: ThemeMode;
  editorSettings: EditorSettings;
  onCodeChange: (code: string) => void;
  onRun: () => void;
}

export function CodeEditor({
  language,
  initialCode,
  themeMode,
  editorSettings,
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
          ...buildExtensions(editorSettings),
          getLangExtension(language),
          ...buildThemeExtensions(themeMode, editorSettings),
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
    [language, themeMode, editorSettings, onCodeChange],
  );

  useEffect(() => {
    createEditor(initialCode);
    return () => {
      viewRef.current?.destroy();
    };
  }, [initialCode, createEditor]);

  return <div ref={containerRef} className="code-editor" />;
}

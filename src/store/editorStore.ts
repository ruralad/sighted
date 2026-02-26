import { create } from "zustand";
import { get, set } from "idb-keyval";

export type EditorFontFamily =
  | "JetBrains Mono"
  | "Fira Code"
  | "Source Code Pro"
  | "Cascadia Code"
  | "monospace";

export type EditorThemeId =
  | "auto"
  | "oneDark"
  | "dracula"
  | "githubDark"
  | "githubLight"
  | "gruvboxDark"
  | "gruvboxLight"
  | "materialDark"
  | "materialLight"
  | "monokai"
  | "monokaiDimmed"
  | "nord"
  | "solarizedDark"
  | "solarizedLight"
  | "sublime"
  | "tokyoNight"
  | "tokyoNightDay"
  | "tokyoNightStorm"
  | "vscodeDark"
  | "vscodeLight"
  | "xcodeDark"
  | "xcodeLight"
  | "androidstudio"
  | "atomone"
  | "aura"
  | "bbedit"
  | "bespin"
  | "copilot"
  | "darcula"
  | "eclipse"
  | "okaidia";

export interface EditorSettings {
  fontSize: number;
  fontFamily: EditorFontFamily;
  lineHeight: number;
  tabSize: number;
  indentWithTabs: boolean;
  lineNumbers: boolean;
  foldGutter: boolean;
  highlightActiveLine: boolean;
  bracketMatching: boolean;
  closeBrackets: boolean;
  autocompletion: boolean;
  highlightSelectionMatches: boolean;
  lineWrapping: boolean;
  scrollPastEnd: boolean;
  editorTheme: EditorThemeId;
  adaptAppTheme: boolean;
}

const EDITOR_KEY = "sighted75:editor";

export const DEFAULT_EDITOR: EditorSettings = {
  fontSize: 13,
  fontFamily: "JetBrains Mono",
  lineHeight: 1.7,
  tabSize: 2,
  indentWithTabs: false,
  lineNumbers: true,
  foldGutter: true,
  highlightActiveLine: true,
  bracketMatching: true,
  closeBrackets: true,
  autocompletion: true,
  highlightSelectionMatches: true,
  lineWrapping: false,
  scrollPastEnd: false,
  editorTheme: "auto",
  adaptAppTheme: false,
};

// Metadata for the theme picker UI — grouped by variant for easier browsing
export const EDITOR_THEME_OPTIONS: { value: EditorThemeId; label: string; variant: "dark" | "light" | "auto" }[] = [
  { value: "auto", label: "Sighted (Auto)", variant: "auto" },
  { value: "oneDark", label: "One Dark", variant: "dark" },
  { value: "dracula", label: "Dracula", variant: "dark" },
  { value: "githubDark", label: "GitHub Dark", variant: "dark" },
  { value: "githubLight", label: "GitHub Light", variant: "light" },
  { value: "gruvboxDark", label: "Gruvbox Dark", variant: "dark" },
  { value: "gruvboxLight", label: "Gruvbox Light", variant: "light" },
  { value: "materialDark", label: "Material Dark", variant: "dark" },
  { value: "materialLight", label: "Material Light", variant: "light" },
  { value: "monokai", label: "Monokai", variant: "dark" },
  { value: "monokaiDimmed", label: "Monokai Dimmed", variant: "dark" },
  { value: "nord", label: "Nord", variant: "dark" },
  { value: "solarizedDark", label: "Solarized Dark", variant: "dark" },
  { value: "solarizedLight", label: "Solarized Light", variant: "light" },
  { value: "sublime", label: "Sublime", variant: "dark" },
  { value: "tokyoNight", label: "Tokyo Night", variant: "dark" },
  { value: "tokyoNightDay", label: "Tokyo Night Day", variant: "light" },
  { value: "tokyoNightStorm", label: "Tokyo Night Storm", variant: "dark" },
  { value: "vscodeDark", label: "VS Code Dark", variant: "dark" },
  { value: "vscodeLight", label: "VS Code Light", variant: "light" },
  { value: "xcodeDark", label: "Xcode Dark", variant: "dark" },
  { value: "xcodeLight", label: "Xcode Light", variant: "light" },
  { value: "androidstudio", label: "Android Studio", variant: "dark" },
  { value: "atomone", label: "Atom One", variant: "dark" },
  { value: "aura", label: "Aura", variant: "dark" },
  { value: "bbedit", label: "BBEdit", variant: "light" },
  { value: "bespin", label: "Bespin", variant: "dark" },
  { value: "copilot", label: "Copilot", variant: "dark" },
  { value: "darcula", label: "Darcula", variant: "dark" },
  { value: "eclipse", label: "Eclipse", variant: "light" },
  { value: "okaidia", label: "Okaidia", variant: "dark" },
];

interface EditorStore {
  settings: EditorSettings;
  loaded: boolean;
  hydrate: () => Promise<void>;
  update: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void;
  resetDefaults: () => void;
}

let didHydrate = false;

export const useEditorStore = create<EditorStore>((setState, getState) => ({
  settings: DEFAULT_EDITOR,
  loaded: false,

  hydrate: async () => {
    if (didHydrate) return;
    didHydrate = true;

    const stored = await get<EditorSettings>(EDITOR_KEY);
    // Merge stored values over defaults so newly added keys get their defaults
    const resolved = stored ? { ...DEFAULT_EDITOR, ...stored } : DEFAULT_EDITOR;
    setState({ settings: resolved, loaded: true });
  },

  update: (key, value) => {
    const { settings } = getState();
    const next = { ...settings, [key]: value };
    setState({ settings: next });
    set(EDITOR_KEY, next);
  },

  resetDefaults: () => {
    setState({ settings: DEFAULT_EDITOR });
    set(EDITOR_KEY, DEFAULT_EDITOR);
  },
}));

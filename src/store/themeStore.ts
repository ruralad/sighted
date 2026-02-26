import { create } from "zustand";
import { get, set } from "idb-keyval";

export type ThemeMode = "dark" | "light";
export type ThemePalette = "emerald" | "ocean" | "amber";

export interface ThemeState {
  mode: ThemeMode;
  palette: ThemePalette;
}

const THEME_KEY = "sighted75:theme";

const DEFAULT_THEME: ThemeState = { mode: "dark", palette: "emerald" };

export const PALETTE_META: Record<ThemePalette, { label: string; swatch: string }> = {
  emerald: { label: "Emerald", swatch: "#22C55E" },
  ocean:   { label: "Ocean",   swatch: "#3B82F6" },
  amber:   { label: "Amber",   swatch: "#F59E0B" },
};

// Sets data attributes on <html> that CSS [data-mode][data-palette] selectors match against
function applyThemeToDOM(theme: ThemeState) {
  document.documentElement.setAttribute("data-mode", theme.mode);
  document.documentElement.setAttribute("data-palette", theme.palette);
}

function getSystemPreference(): ThemeMode {
  if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

interface ThemeStore {
  theme: ThemeState;
  loaded: boolean;
  hydrate: () => Promise<void>;
  toggleMode: () => void;
  setPalette: (palette: ThemePalette) => void;
}

// Module-level guard prevents double hydration in React StrictMode
let didHydrate = false;

export const useThemeStore = create<ThemeStore>((setState, getState) => ({
  theme: DEFAULT_THEME,
  loaded: false,

  hydrate: async () => {
    if (didHydrate) return;
    didHydrate = true;

    const stored = await get<ThemeState>(THEME_KEY);
    // Fall back to OS preference on first visit (no stored theme yet)
    const resolved = stored ?? { ...DEFAULT_THEME, mode: getSystemPreference() };
    applyThemeToDOM(resolved);
    setState({ theme: resolved, loaded: true });
  },

  toggleMode: () => {
    const { theme } = getState();
    const next: ThemeState = { ...theme, mode: theme.mode === "dark" ? "light" : "dark" };
    applyThemeToDOM(next);
    setState({ theme: next });
    set(THEME_KEY, next);
  },

  setPalette: (palette: ThemePalette) => {
    const { theme } = getState();
    const next: ThemeState = { ...theme, palette };
    applyThemeToDOM(next);
    setState({ theme: next });
    set(THEME_KEY, next);
  },
}));

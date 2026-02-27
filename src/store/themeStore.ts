"use client";

import { create } from "zustand";
import { get, set } from "idb-keyval";
import { saveSettings, getSettings } from "../../app/actions/progress";
import { useAuthStore } from "./authStore";

export type ThemeMode = "dark" | "light";
export type ThemePalette = "emerald" | "ocean" | "amber";

export interface ThemeState {
  mode: ThemeMode;
  palette: ThemePalette;
}

const THEME_KEY = "sighted75:theme";

const DEFAULT_THEME: ThemeState = { mode: "light", palette: "emerald" };

export const PALETTE_META: Record<ThemePalette, { label: string; swatch: string }> = {
  emerald: { label: "Emerald", swatch: "#22C55E" },
  ocean:   { label: "Ocean",   swatch: "#3B82F6" },
  amber:   { label: "Amber",   swatch: "#F59E0B" },
};

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

let settingsSyncTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedServerSync() {
  if (settingsSyncTimer) clearTimeout(settingsSyncTimer);
  settingsSyncTimer = setTimeout(() => {
    if (!useAuthStore.getState().isAuthenticated) return;
    const theme = useThemeStore.getState().theme;
    saveSettings(theme, null).catch(() => {});
  }, 2000);
}

interface ThemeStore {
  theme: ThemeState;
  loaded: boolean;
  hydrate: () => Promise<void>;
  toggleMode: () => void;
  setPalette: (palette: ThemePalette) => void;
}

let didHydrate = false;

export const useThemeStore = create<ThemeStore>((setState, getState) => ({
  theme: DEFAULT_THEME,
  loaded: false,

  hydrate: async () => {
    if (didHydrate) return;
    didHydrate = true;

    const stored = await get<ThemeState>(THEME_KEY);
    let resolved = stored ?? { ...DEFAULT_THEME, mode: getSystemPreference() };

    if (useAuthStore.getState().isAuthenticated) {
      const serverSettings = await getSettings().catch(() => null);
      if (serverSettings?.theme) {
        const serverTheme = serverSettings.theme as ThemeState;
        if (serverTheme.mode && serverTheme.palette) {
          resolved = serverTheme;
          set(THEME_KEY, resolved);
        }
      }
    }

    applyThemeToDOM(resolved);
    setState({ theme: resolved, loaded: true });
  },

  toggleMode: () => {
    const { theme } = getState();
    const next: ThemeState = { ...theme, mode: theme.mode === "dark" ? "light" : "dark" };
    applyThemeToDOM(next);
    setState({ theme: next });
    set(THEME_KEY, next);
    debouncedServerSync();
  },

  setPalette: (palette: ThemePalette) => {
    const { theme } = getState();
    const next: ThemeState = { ...theme, palette };
    applyThemeToDOM(next);
    setState({ theme: next });
    set(THEME_KEY, next);
    debouncedServerSync();
  },
}));

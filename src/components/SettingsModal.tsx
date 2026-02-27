"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useThemeStore, PALETTE_META, type ThemePalette } from "../store/themeStore";
import {
  useEditorStore,
  EDITOR_THEME_OPTIONS,
  type EditorFontFamily,
  type EditorThemeId,
  type EditorSettings,
} from "../store/editorStore";
import { useCompletionStore } from "../store/completionStore";
import { useQuestionStore } from "../store/questionStore";
import { useAuthStore } from "../store/authStore";
import { authClient } from "../lib/auth/client";

const PALETTES = Object.entries(PALETTE_META) as [ThemePalette, typeof PALETTE_META[ThemePalette]][];

type SettingsTab = "editor" | "appearance" | "account";

const FONT_OPTIONS: { value: EditorFontFamily; label: string }[] = [
  { value: "JetBrains Mono", label: "JetBrains Mono" },
  { value: "Fira Code", label: "Fira Code" },
  { value: "Source Code Pro", label: "Source Code Pro" },
  { value: "Cascadia Code", label: "Cascadia Code" },
  { value: "monospace", label: "System Mono" },
];

const TAB_SIZE_OPTIONS = [2, 4, 8] as const;

const TOGGLE_FEATURES: { key: keyof EditorSettings; label: string; desc: string }[] = [
  { key: "lineNumbers", label: "Line Numbers", desc: "Show line numbers in the gutter" },
  { key: "foldGutter", label: "Code Folding", desc: "Fold/unfold code blocks via gutter" },
  { key: "highlightActiveLine", label: "Active Line", desc: "Highlight the line with the cursor" },
  { key: "bracketMatching", label: "Bracket Matching", desc: "Highlight matching brackets" },
  { key: "closeBrackets", label: "Auto Close Brackets", desc: "Insert closing bracket automatically" },
  { key: "autocompletion", label: "Autocomplete", desc: "Show completion hints while typing" },
  { key: "highlightSelectionMatches", label: "Selection Matches", desc: "Highlight other occurrences of selected text" },
  { key: "lineWrapping", label: "Word Wrap", desc: "Wrap long lines instead of scrolling" },
  { key: "scrollPastEnd", label: "Scroll Past End", desc: "Allow scrolling beyond the last line" },
  { key: "indentWithTabs", label: "Indent with Tabs", desc: "Use tab characters instead of spaces" },
];

const sunIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const moonIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const closeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const editorIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
  </svg>
);

const themeIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const accountIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

function SettingsRow({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${disabled ? "opacity-45 pointer-events-none" : ""}`}>
      {children}
    </div>
  );
}

function SettingsRowInfo({ name, desc }: { name: string; desc?: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[13px] font-medium text-[var(--text)]">{name}</span>
      {desc && <span className="text-[11px] text-[var(--text-muted)]">{desc}</span>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-[family-name:var(--font-display)] text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">
      {children}
    </h3>
  );
}

function AppearanceTab() {
  const mode = useThemeStore((s) => s.theme.mode);
  const palette = useThemeStore((s) => s.theme.palette);
  const toggleMode = useThemeStore((s) => s.toggleMode);
  const setPalette = useThemeStore((s) => s.setPalette);

  const adaptAppTheme = useEditorStore((s) => s.settings.adaptAppTheme);
  const editorTheme = useEditorStore((s) => s.settings.editorTheme);
  const zenFullscreen = useEditorStore((s) => s.settings.zenFullscreen);
  const showHints = useEditorStore((s) => s.settings.showHints);
  const showKeywords = useEditorStore((s) => s.settings.showKeywords);
  const updateEditor = useEditorStore((s) => s.update);

  const themeDisabled = adaptAppTheme && editorTheme !== "auto";

  return (
    <>
      <section className="flex flex-col gap-4">
        <SectionLabel>Theme</SectionLabel>

        {themeDisabled && (
          <div className="text-[12px] leading-[1.5] text-[var(--text-muted)] bg-[var(--accent-dim)] border-l-[3px] border-l-[var(--accent)] px-3 py-2 rounded-r-[var(--radius-sm)] mb-2">
            Theme is controlled by the editor&apos;s <strong className="text-[var(--text-secondary)]">Adapt App Theme</strong> setting.
            Disable it in the Editor tab to change mode and palette manually.
          </div>
        )}

        <SettingsRow disabled={themeDisabled}>
          <SettingsRowInfo name="Mode" desc="Switch between dark and light" />
          <div className="flex bg-[var(--bg-primary)] border border-[var(--border-bright)] rounded-[var(--radius-md)] p-[3px] gap-0.5 transition-colors duration-300">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[13px] font-medium whitespace-nowrap cursor-pointer transition-[color,background-color] duration-150 ease-out ${
                mode === "dark"
                  ? "bg-[var(--accent)] text-[var(--accent-text-on)] font-semibold cursor-default"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
              }`}
              onClick={() => { if (!themeDisabled && mode !== "dark") toggleMode(); }}
              disabled={themeDisabled}
              aria-label="Dark mode"
            >
              {moonIcon} Dark
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[13px] font-medium whitespace-nowrap cursor-pointer transition-[color,background-color] duration-150 ease-out ${
                mode === "light"
                  ? "bg-[var(--accent)] text-[var(--accent-text-on)] font-semibold cursor-default"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
              }`}
              onClick={() => { if (!themeDisabled && mode !== "light") toggleMode(); }}
              disabled={themeDisabled}
              aria-label="Light mode"
            >
              {sunIcon} Light
            </button>
          </div>
        </SettingsRow>

        <SettingsRow disabled={themeDisabled}>
          <SettingsRowInfo name="Palette" desc="Choose your accent color" />
          <div className="flex gap-1.5">
            {PALETTES.map(([key, meta]) => (
              <button
                key={key}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border cursor-pointer transition-[border-color,background-color] duration-150 ease-out ${
                  palette === key
                    ? "border-[var(--accent)] bg-[var(--accent-dim)]"
                    : "border-[var(--border-bright)] bg-[var(--bg-primary)] hover:border-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]"
                }`}
                onClick={() => { if (!themeDisabled) setPalette(key); }}
                disabled={themeDisabled}
                aria-label={`${meta.label} palette`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ background: meta.swatch }}
                />
                <span className={`text-[13px] font-medium ${palette === key ? "text-[var(--accent)] font-semibold" : "text-[var(--text-secondary)]"}`}>
                  {meta.label}
                </span>
              </button>
            ))}
          </div>
        </SettingsRow>
      </section>

      <section className="flex flex-col gap-4">
        <SectionLabel>Zen Mode</SectionLabel>
        <SettingsRow>
          <SettingsRowInfo name="Fullscreen" desc="Enter true fullscreen when activating Zen Mode" />
          <label className="settings-toggle">
            <input type="checkbox" checked={zenFullscreen} onChange={(e) => updateEditor("zenFullscreen", e.target.checked)} />
            <span className="settings-toggle__track" />
          </label>
        </SettingsRow>
      </section>

      <section className="flex flex-col gap-4">
        <SectionLabel>Question Panel</SectionLabel>
        <SettingsRow>
          <SettingsRowInfo name="Hints" desc="Show the progressive hint panel below questions" />
          <label className="settings-toggle">
            <input type="checkbox" checked={showHints} onChange={(e) => updateEditor("showHints", e.target.checked)} />
            <span className="settings-toggle__track" />
          </label>
        </SettingsRow>
        <SettingsRow>
          <SettingsRowInfo name="Keywords" desc="Show difficulty and category badges on questions" />
          <label className="settings-toggle">
            <input type="checkbox" checked={showKeywords} onChange={(e) => updateEditor("showKeywords", e.target.checked)} />
            <span className="settings-toggle__track" />
          </label>
        </SettingsRow>
      </section>
    </>
  );
}

function EditorTab() {
  const settings = useEditorStore((s) => s.settings);
  const update = useEditorStore((s) => s.update);
  const resetDefaults = useEditorStore((s) => s.resetDefaults);

  return (
    <>
      <section className="flex flex-col gap-4">
        <SectionLabel>Editor Theme</SectionLabel>

        <SettingsRow>
          <SettingsRowInfo name="Syntax Theme" desc="Color scheme for the code editor" />
          <select
            className="px-2.5 py-1.5 border border-[var(--border-bright)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] text-[var(--text)] text-[13px] font-[family-name:var(--font-body)] cursor-pointer outline-none transition-[border-color] duration-150 ease-out min-w-[150px] focus:border-[var(--accent)]"
            value={settings.editorTheme}
            onChange={(e) => update("editorTheme", e.target.value as EditorThemeId)}
          >
            {EDITOR_THEME_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}{t.variant !== "auto" ? ` (${t.variant})` : ""}
              </option>
            ))}
          </select>
        </SettingsRow>

        <SettingsRow>
          <SettingsRowInfo
            name="Adapt App Theme"
            desc={settings.editorTheme === "auto" ? "Select a syntax theme first to enable" : "Match the entire app to the editor theme"}
          />
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.adaptAppTheme}
              disabled={settings.editorTheme === "auto"}
              onChange={(e) => update("adaptAppTheme", e.target.checked)}
            />
            <span className="settings-toggle__track" />
          </label>
        </SettingsRow>
      </section>

      <section className="flex flex-col gap-4">
        <SectionLabel>Typography</SectionLabel>

        <SettingsRow>
          <SettingsRowInfo name="Font Family" />
          <select
            className="px-2.5 py-1.5 border border-[var(--border-bright)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] text-[var(--text)] text-[13px] font-[family-name:var(--font-body)] cursor-pointer outline-none transition-[border-color] duration-150 ease-out min-w-[150px] focus:border-[var(--accent)]"
            value={settings.fontFamily}
            onChange={(e) => update("fontFamily", e.target.value as EditorFontFamily)}
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </SettingsRow>

        <SettingsRow>
          <SettingsRowInfo name="Font Size" desc={`${settings.fontSize}px`} />
          <input
            className="settings-slider"
            type="range"
            min={10}
            max={24}
            step={1}
            value={settings.fontSize}
            onChange={(e) => update("fontSize", Number(e.target.value))}
          />
        </SettingsRow>

        <SettingsRow>
          <SettingsRowInfo name="Line Height" desc={settings.lineHeight.toFixed(1)} />
          <input
            className="settings-slider"
            type="range"
            min={1.2}
            max={2.2}
            step={0.1}
            value={settings.lineHeight}
            onChange={(e) => update("lineHeight", Number(e.target.value))}
          />
        </SettingsRow>
      </section>

      <section className="flex flex-col gap-4">
        <SectionLabel>Indentation</SectionLabel>

        <SettingsRow>
          <SettingsRowInfo name="Tab Size" />
          <div className="flex bg-[var(--bg-primary)] border border-[var(--border-bright)] rounded-[var(--radius-md)] p-[3px] gap-0.5">
            {TAB_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                className={`px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium cursor-pointer transition-[color,background-color] duration-150 ease-out ${
                  settings.tabSize === size
                    ? "bg-[var(--accent)] text-[var(--accent-text-on)] font-semibold cursor-default"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                }`}
                onClick={() => update("tabSize", size)}
              >
                {size}
              </button>
            ))}
          </div>
        </SettingsRow>
      </section>

      <section className="flex flex-col gap-4">
        <SectionLabel>Features</SectionLabel>

        {TOGGLE_FEATURES.map(({ key, label, desc }) => (
          <SettingsRow key={key}>
            <SettingsRowInfo name={label} desc={desc} />
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings[key] as boolean}
                onChange={(e) => update(key, e.target.checked)}
              />
              <span className="settings-toggle__track" />
            </label>
          </SettingsRow>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <button
          className="w-full text-center text-[12px] text-[var(--text-muted)] px-3 py-2 hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] rounded-[var(--radius-md)] transition-[color,background-color] duration-200 ease-out"
          onClick={resetDefaults}
        >
          Reset Editor to Defaults
        </button>
      </section>
    </>
  );
}

function AccountTab() {
  const resetProgress = useCompletionStore((s) => s.resetProgress);
  const completed = useCompletionStore((s) => s.completed);
  const stats = useCompletionStore((s) => s.stats);
  const totalQuestions = useQuestionStore((s) => s.totalQuestions);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleReset = useCallback(async () => {
    await resetProgress();
    window.location.reload();
  }, [resetProgress]);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    await authClient.signOut().catch(() => {});
    window.location.reload();
  }, []);

  const totalAttempts = Array.from(stats.values()).reduce((sum, s) => sum + s.attempts, 0);
  const totalRevisits = Array.from(stats.values()).reduce((sum, s) => sum + s.revisits, 0);

  return (
    <>
      {isAuthenticated && user ? (
        <section className="flex flex-col gap-4">
          <SectionLabel>Account</SectionLabel>
          <SettingsRow>
            <div className="flex items-center gap-3">
              {user.image ? (
                <img
                  src={user.image}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--accent-text-on)] text-[13px] font-bold">
                  {user.name?.charAt(0)?.toUpperCase() ?? user.email?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-[var(--text)]">{user.name}</span>
                <span className="text-[11px] text-[var(--text-muted)]">{user.email}</span>
              </div>
            </div>
            <button
              className="px-3 py-2 text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] rounded-[var(--radius-md)] transition-[color,background-color] duration-200 ease-out"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? "Signing out\u2026" : "Sign Out"}
            </button>
          </SettingsRow>
          <SettingsRow>
            <SettingsRowInfo name="Manage Account" desc="Profile, security, and connected accounts" />
            <a
              href="/account/settings"
              className="px-3 py-2 text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] rounded-[var(--radius-md)] transition-[color,background-color] duration-200 ease-out"
            >
              Open
            </a>
          </SettingsRow>
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <SectionLabel>Account</SectionLabel>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 flex flex-col gap-3">
            <p className="text-[13px] text-[var(--text-secondary)] leading-[1.6]">
              Your progress is saved locally in this browser. Sign in to sync
              across devices and never lose your work.
            </p>
            <div className="flex gap-2">
              <a
                href="/auth/sign-in"
                className="px-4 py-2 rounded-[var(--radius-md)] text-[13px] font-semibold bg-[var(--accent)] text-[var(--accent-text-on)] transition-[background-color,box-shadow] duration-200 ease-out hover:bg-[var(--accent-hover)] hover:shadow-[0_0_20px_var(--accent-glow)]"
              >
                Sign In
              </a>
              <a
                href="/auth/sign-up"
                className="px-4 py-2 rounded-[var(--radius-md)] text-[13px] font-semibold bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-bright)] transition-[background-color,color] duration-200 ease-out hover:text-[var(--text)] hover:bg-[var(--bg-surface)]"
              >
                Sign Up
              </a>
            </div>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <SectionLabel>Progress</SectionLabel>

        <SettingsRow>
          <SettingsRowInfo name="Completed" desc={`${completed.size} of ${totalQuestions} questions`} />
        </SettingsRow>

        <SettingsRow>
          <SettingsRowInfo name="Total Attempts" desc={`${totalAttempts} runs across all questions`} />
        </SettingsRow>

        <SettingsRow>
          <SettingsRowInfo name="Total Revisits" desc={`${totalRevisits} question revisits`} />
        </SettingsRow>

        <SettingsRow>
          <SettingsRowInfo name="Reset Progress" desc="Clear all completion data and start fresh" />
          {confirming ? (
            <div className="flex gap-1.5 items-center">
              <button
                className="px-2.5 py-1 text-[0.8rem] font-semibold rounded-[var(--radius-md)] bg-[var(--red)] text-white hover:bg-[#DC2626] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-[background-color,box-shadow] duration-200 ease-out"
                onClick={handleReset}
              >
                Yes, Reset
              </button>
              <button
                className="px-2.5 py-1 text-[0.8rem] font-semibold rounded-[var(--radius-md)] bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-bright)] hover:text-[var(--text)] hover:bg-[var(--bg-elevated)] transition-[background-color,color] duration-200 ease-out"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="px-3 py-2 text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] rounded-[var(--radius-md)] transition-[color,background-color] duration-200 ease-out"
              onClick={() => setConfirming(true)}
              disabled={completed.size === 0}
            >
              Reset
            </button>
          )}
        </SettingsRow>
      </section>
    </>
  );
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "editor", label: "Editor", icon: editorIcon },
  { id: "appearance", label: "Appearance", icon: themeIcon },
  { id: "account", label: "Account", icon: accountIcon },
];

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("editor");
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-[8px] flex items-center justify-center z-[200] animate-fade-in-fast overscroll-contain"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border-bright)] rounded-[var(--radius-lg)] w-[680px] h-[540px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-64px)] flex flex-row overscroll-contain shadow-[0_0_0_1px_var(--border-bright),0_8px_16px_rgba(0,0,0,0.2),0_32px_80px_rgba(0,0,0,0.5)] animate-fade-in-up-dialog overflow-hidden"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        {/* Sidebar */}
        <nav className="w-[180px] shrink-0 flex flex-col bg-[var(--bg-primary)] border-r border-[var(--border-bright)] py-5 max-md:w-full max-md:flex-row max-md:border-r-0 max-md:border-b max-md:py-3 max-md:px-3 max-md:items-center max-md:gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-[14px] font-bold text-[var(--text)] tracking-[-0.01em] px-5 pb-4 max-md:px-2 max-md:pb-0 max-md:text-[13px]">
            Settings
          </h2>
          <div className="flex flex-col gap-0.5 px-2 max-md:flex-row max-md:px-0 max-md:gap-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-md)] text-[13px] font-medium cursor-pointer transition-[color,background-color] duration-150 ease-out text-left w-full max-md:px-2.5 max-md:py-2 max-md:text-[12px] max-md:gap-1.5 ${
                  activeTab === tab.id
                    ? "text-[var(--accent)] bg-[var(--accent-dim)] font-semibold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="flex items-center justify-center shrink-0 w-[18px] h-[18px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between px-[22px] pt-[18px] pb-3.5 border-b border-[var(--border)] shrink-0">
            <h3 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-[var(--text)] tracking-[-0.01em]">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h3>
            <button
              className="flex items-center justify-center w-[30px] h-[30px] rounded-[var(--radius-md)] text-[var(--text-muted)] cursor-pointer transition-[color,background-color] duration-150 ease-out hover:text-[var(--text)] hover:bg-[var(--bg-elevated)]"
              onClick={onClose}
              aria-label="Close settings"
            >
              {closeIcon}
            </button>
          </div>
          <div className="px-[22px] pt-4 pb-[22px] overflow-y-auto flex-1 flex flex-col gap-6">
            {activeTab === "editor" && <EditorTab />}
            {activeTab === "appearance" && <AppearanceTab />}
            {activeTab === "account" && <AccountTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

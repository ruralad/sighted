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

// --- SVG icons (hoisted) ---

const sunIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const moonIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const closeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Tab icons
const editorIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const themeIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const accountIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// --- Tab content components ---

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
      <section className="settings-section">
        <h3 className="settings-section__label">Theme</h3>

        {themeDisabled && (
          <div className="settings-notice">
            Theme is controlled by the editor&apos;s <strong>Adapt App Theme</strong> setting.
            Disable it in the Editor tab to change mode and palette manually.
          </div>
        )}

        <div className={`settings-row ${themeDisabled ? "settings-row--disabled" : ""}`}>
          <div className="settings-row__info">
            <span className="settings-row__name">Mode</span>
            <span className="settings-row__desc">Switch between dark and light</span>
          </div>
          <div className="settings-mode-toggle">
            <button
              className={`settings-mode-toggle__option ${mode === "dark" ? "settings-mode-toggle__option--active" : ""}`}
              onClick={() => { if (!themeDisabled && mode !== "dark") toggleMode(); }}
              disabled={themeDisabled}
              aria-label="Dark mode"
            >
              {moonIcon} Dark
            </button>
            <button
              className={`settings-mode-toggle__option ${mode === "light" ? "settings-mode-toggle__option--active" : ""}`}
              onClick={() => { if (!themeDisabled && mode !== "light") toggleMode(); }}
              disabled={themeDisabled}
              aria-label="Light mode"
            >
              {sunIcon} Light
            </button>
          </div>
        </div>

        <div className={`settings-row ${themeDisabled ? "settings-row--disabled" : ""}`}>
          <div className="settings-row__info">
            <span className="settings-row__name">Palette</span>
            <span className="settings-row__desc">Choose your accent color</span>
          </div>
          <div className="settings-palette-picker">
            {PALETTES.map(([key, meta]) => (
              <button
                key={key}
                className={`settings-palette-picker__item ${palette === key ? "settings-palette-picker__item--active" : ""}`}
                onClick={() => { if (!themeDisabled) setPalette(key); }}
                disabled={themeDisabled}
                aria-label={`${meta.label} palette`}
              >
                <span
                  className="settings-palette-picker__swatch"
                  style={{ "--swatch-color": meta.swatch } as React.CSSProperties}
                />
                <span className="settings-palette-picker__label">{meta.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__label">Zen Mode</h3>

        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__name">Fullscreen</span>
            <span className="settings-row__desc">Enter true fullscreen when activating Zen Mode</span>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={zenFullscreen}
              onChange={(e) => updateEditor("zenFullscreen", e.target.checked)}
            />
            <span className="settings-toggle__track" />
          </label>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__label">Question Panel</h3>

        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__name">Hints</span>
            <span className="settings-row__desc">Show the progressive hint panel below questions</span>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={showHints}
              onChange={(e) => updateEditor("showHints", e.target.checked)}
            />
            <span className="settings-toggle__track" />
          </label>
        </div>

        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__name">Keywords</span>
            <span className="settings-row__desc">Show difficulty and category badges on questions</span>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={showKeywords}
              onChange={(e) => updateEditor("showKeywords", e.target.checked)}
            />
            <span className="settings-toggle__track" />
          </label>
        </div>
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
      <section className="settings-section">
        <h3 className="settings-section__label">Editor Theme</h3>

        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__name">Syntax Theme</span>
            <span className="settings-row__desc">Color scheme for the code editor</span>
          </div>
          <select
            className="settings-select"
            value={settings.editorTheme}
            onChange={(e) => update("editorTheme", e.target.value as EditorThemeId)}
          >
            {EDITOR_THEME_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}{t.variant !== "auto" ? ` (${t.variant})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__name">Adapt App Theme</span>
            <span className="settings-row__desc">
              {settings.editorTheme === "auto"
                ? "Select a syntax theme first to enable"
                : "Match the entire app to the editor theme"}
            </span>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.adaptAppTheme}
              disabled={settings.editorTheme === "auto"}
              onChange={(e) => update("adaptAppTheme", e.target.checked)}
            />
            <span className="settings-toggle__track" />
          </label>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__label">Typography</h3>

        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__name">Font Family</span>
          </div>
          <select
            className="settings-select"
            value={settings.fontFamily}
            onChange={(e) => update("fontFamily", e.target.value as EditorFontFamily)}
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__name">Font Size</span>
            <span className="settings-row__desc">{settings.fontSize}px</span>
          </div>
          <input
            className="settings-slider"
            type="range"
            min={10}
            max={24}
            step={1}
            value={settings.fontSize}
            onChange={(e) => update("fontSize", Number(e.target.value))}
          />
        </div>

        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__name">Line Height</span>
            <span className="settings-row__desc">{settings.lineHeight.toFixed(1)}</span>
          </div>
          <input
            className="settings-slider"
            type="range"
            min={1.2}
            max={2.2}
            step={0.1}
            value={settings.lineHeight}
            onChange={(e) => update("lineHeight", Number(e.target.value))}
          />
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__label">Indentation</h3>

        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__name">Tab Size</span>
          </div>
          <div className="settings-segmented">
            {TAB_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                className={`settings-segmented__item ${settings.tabSize === size ? "settings-segmented__item--active" : ""}`}
                onClick={() => update("tabSize", size)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__label">Features</h3>

        {TOGGLE_FEATURES.map(({ key, label, desc }) => (
          <div className="settings-row" key={key}>
            <div className="settings-row__info">
              <span className="settings-row__name">{label}</span>
              <span className="settings-row__desc">{desc}</span>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings[key] as boolean}
                onChange={(e) => update(key, e.target.checked)}
              />
              <span className="settings-toggle__track" />
            </label>
          </div>
        ))}
      </section>

      <section className="settings-section">
        <button
          className="btn btn--ghost settings-reset-btn"
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
  const totalQuestions = useQuestionStore((s) => s.totalQuestions);
  const [confirming, setConfirming] = useState(false);

  const handleReset = useCallback(async () => {
    await resetProgress();
    window.location.reload();
  }, [resetProgress]);

  return (
    <>
      <section className="settings-section">
        <h3 className="settings-section__label">Progress</h3>

        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__name">Completed</span>
            <span className="settings-row__desc">
              {completed.size} of {totalQuestions} questions
            </span>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__name">Reset Progress</span>
            <span className="settings-row__desc">Clear all completion data and start fresh</span>
          </div>
          {confirming ? (
            <div className="settings-confirm-inline">
              <button className="btn btn--danger btn--sm" onClick={handleReset}>
                Yes, Reset
              </button>
              <button className="btn btn--secondary btn--sm" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setConfirming(true)}
              disabled={completed.size === 0}
            >
              Reset
            </button>
          )}
        </div>
      </section>
    </>
  );
}

// --- Main modal ---

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
    <div className="settings-overlay" onClick={onClose}>
      <div
        className="settings-panel"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        <nav className="settings-sidebar">
          <h2 className="settings-sidebar__title">Settings</h2>
          <div className="settings-sidebar__tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`settings-sidebar__tab ${activeTab === tab.id ? "settings-sidebar__tab--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="settings-sidebar__tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="settings-main">
          <div className="settings-main__header">
            <h3 className="settings-main__title">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h3>
            <button
              className="settings-panel__close"
              onClick={onClose}
              aria-label="Close settings"
            >
              {closeIcon}
            </button>
          </div>
          <div className="settings-main__body">
            {activeTab === "editor" && <EditorTab />}
            {activeTab === "appearance" && <AppearanceTab />}
            {activeTab === "account" && <AccountTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

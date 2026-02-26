import { useEffect, useRef, useCallback } from "react";
import { useThemeStore, PALETTE_META, type ThemePalette } from "../store/themeStore";

const PALETTES = Object.entries(PALETTE_META) as [ThemePalette, typeof PALETTE_META[ThemePalette]][];

const sunIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const closeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const mode = useThemeStore((s) => s.theme.mode);
  const palette = useThemeStore((s) => s.theme.palette);
  const toggleMode = useThemeStore((s) => s.toggleMode);
  const setPalette = useThemeStore((s) => s.setPalette);
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
      {/* stopPropagation prevents clicks inside the panel from closing via the overlay handler */}
      <div
        className="settings-panel"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        <div className="settings-panel__header">
          <h2 className="settings-panel__title">Settings</h2>
          <button
            className="settings-panel__close"
            onClick={onClose}
            aria-label="Close settings"
          >
            {closeIcon}
          </button>
        </div>

        <div className="settings-panel__body">
          <section className="settings-section">
            <h3 className="settings-section__label">Appearance</h3>

            <div className="settings-row">
              <div className="settings-row__info">
                <span className="settings-row__name">Mode</span>
                <span className="settings-row__desc">Switch between dark and light</span>
              </div>
              <div className="settings-mode-toggle">
                <button
                  className={`settings-mode-toggle__option ${mode === "dark" ? "settings-mode-toggle__option--active" : ""}`}
                  onClick={() => { if (mode !== "dark") toggleMode(); }}
                  aria-label="Dark mode"
                >
                  {moonIcon} Dark
                </button>
                <button
                  className={`settings-mode-toggle__option ${mode === "light" ? "settings-mode-toggle__option--active" : ""}`}
                  onClick={() => { if (mode !== "light") toggleMode(); }}
                  aria-label="Light mode"
                >
                  {sunIcon} Light
                </button>
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-row__info">
                <span className="settings-row__name">Palette</span>
                <span className="settings-row__desc">Choose your accent color</span>
              </div>
              <div className="settings-palette-picker">
                {PALETTES.map(([key, meta]) => (
                  <button
                    key={key}
                    className={`settings-palette-picker__item ${palette === key ? "settings-palette-picker__item--active" : ""}`}
                    onClick={() => setPalette(key)}
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
        </div>
      </div>
    </div>
  );
}

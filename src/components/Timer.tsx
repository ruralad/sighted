"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTimerStore } from "@/store/timerStore";

const COUNTDOWN_PRESETS = [
  { label: "15m", seconds: 15 * 60 },
  { label: "20m", seconds: 20 * 60 },
  { label: "30m", seconds: 30 * 60 },
  { label: "60m", seconds: 60 * 60 },
] as const;

const MIN_CUSTOM = 1;
const MAX_CUSTOM = 180;

const playIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
    <polygon points="6,3 20,12 6,21" />
  </svg>
);

const pauseIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
    <rect x="5" y="3" width="5" height="18" rx="1" />
    <rect x="14" y="3" width="5" height="18" rx="1" />
  </svg>
);

const resetIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const clockIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const hourglassIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 22h14" /><path d="M5 2h14" />
    <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
    <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
  </svg>
);

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface TimerProps {
  questionId: number | null;
  zen?: boolean;
}

export function Timer({ questionId, zen }: TimerProps) {
  const mode = useTimerStore((s) => s.mode);
  const elapsed = useTimerStore((s) => s.elapsed);
  const countdownTotal = useTimerStore((s) => s.countdownTotal);
  const remaining = useTimerStore((s) => s.remaining);
  const isRunning = useTimerStore((s) => s.isRunning);
  const expired = useTimerStore((s) => s.expired);
  const tick = useTimerStore((s) => s.tick);
  const toggleRunning = useTimerStore((s) => s.toggleRunning);
  const handleReset = useTimerStore((s) => s.reset);
  const switchMode = useTimerStore((s) => s.switchMode);
  const selectPreset = useTimerStore((s) => s.selectPreset);
  const resetForQuestion = useTimerStore((s) => s.resetForQuestion);

  const [showPresets, setShowPresets] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const presetsRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isRunning, tick]);

  useEffect(() => {
    resetForQuestion(questionId);
  }, [questionId, resetForQuestion]);

  useEffect(() => {
    if (!showPresets) return;
    const handleClick = (e: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPresets]);

  useEffect(() => {
    if (showPresets && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showPresets]);

  const handleCustomSubmit = useCallback(() => {
    const mins = parseInt(customInput, 10);
    if (Number.isNaN(mins) || mins < MIN_CUSTOM || mins > MAX_CUSTOM) return;
    selectPreset(mins * 60);
    setShowPresets(false);
    setCustomInput("");
  }, [customInput, selectPreset]);

  const displayTime = mode === "stopwatch" ? formatTime(elapsed) : formatTime(remaining);
  const isCountdownDanger = mode === "countdown" && remaining <= 60 && remaining > 0 && isRunning;
  const badgeLabel = `${Math.floor(countdownTotal / 60)}m`;

  const iconBtnClass = "flex items-center justify-center w-[26px] h-[26px] rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-[color,background-color] duration-150 ease-out cursor-pointer hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]";

  const controlButtons = (
    <>
      <button
        className={iconBtnClass}
        onClick={switchMode}
        aria-label={mode === "stopwatch" ? "Switch to countdown" : "Switch to stopwatch"}
        title={mode === "stopwatch" ? "Switch to countdown" : "Switch to stopwatch"}
      >
        {mode === "stopwatch" ? clockIcon : hourglassIcon}
      </button>
      <button
        className={iconBtnClass}
        onClick={toggleRunning}
        aria-label={isRunning ? "Pause" : "Start"}
        title={isRunning ? "Pause" : "Start"}
      >
        {isRunning ? pauseIcon : playIcon}
      </button>
      <button
        className={iconBtnClass}
        onClick={handleReset}
        aria-label="Reset timer"
        title="Reset"
      >
        {resetIcon}
      </button>
      {mode === "countdown" ? (
        <div className="relative" ref={presetsRef}>
          <button
            className="flex items-center justify-center h-[26px] px-1.5 rounded-[var(--radius-sm)] text-[10px] font-semibold text-[var(--text-muted)] transition-[color,background-color] duration-150 ease-out cursor-pointer hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
            onClick={() => setShowPresets((p) => !p)}
            aria-label="Timer presets"
            title="Timer presets"
          >
            {badgeLabel}
          </button>
          {showPresets ? (
            <div className="absolute top-[calc(100%+4px)] right-0 bg-[var(--bg-surface)] border border-[var(--border-bright)] rounded-[var(--radius-md)] shadow-[var(--shadow-dialog)] py-1 z-50 animate-fade-in-fast min-w-[100px]">
              {COUNTDOWN_PRESETS.map((p) => (
                <button
                  key={p.seconds}
                  className={`w-full text-left px-3 py-1.5 text-[12px] font-medium transition-[color,background-color] duration-150 ${
                    countdownTotal === p.seconds
                      ? "text-[var(--accent)] bg-[var(--accent-dim)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-elevated)]"
                  }`}
                  onClick={() => { selectPreset(p.seconds); setShowPresets(false); setCustomInput(""); }}
                >
                  {p.label}
                </button>
              ))}
              <div className="border-t border-[var(--border)] mt-1 pt-1 px-2 pb-1">
                <form
                  className="flex items-center gap-1"
                  onSubmit={(e) => { e.preventDefault(); handleCustomSubmit(); }}
                >
                  <input
                    ref={customInputRef}
                    type="number"
                    min={MIN_CUSTOM}
                    max={MAX_CUSTOM}
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="min"
                    className="w-[48px] px-1.5 py-1 text-[12px] rounded-[var(--radius-sm)] border border-[var(--border-bright)] bg-[var(--bg-primary)] text-[var(--text)] outline-none tabular-nums text-center transition-[border-color] duration-150 focus:border-[var(--accent)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    aria-label="Custom minutes"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 text-[11px] font-semibold rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-text-on)] transition-[background-color] duration-150 hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:pointer-events-none"
                    disabled={!customInput || parseInt(customInput, 10) < MIN_CUSTOM || parseInt(customInput, 10) > MAX_CUSTOM}
                  >
                    Set
                  </button>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (zen) {
    return (
      <div className="group/timer flex items-center gap-1">
        <span
          className={`text-[13px] font-[family-name:var(--font-display)] font-semibold tabular-nums min-w-[52px] text-center select-none transition-colors duration-150 ${
            expired
              ? "text-[var(--red)] animate-pulse"
              : isCountdownDanger
                ? "text-[var(--yellow,var(--accent))]"
                : isRunning
                  ? "text-[var(--text)]"
                  : "text-[var(--text-muted)]"
          }`}
        >
          {displayTime}
        </span>
        <div className="flex items-center gap-1 max-w-0 overflow-hidden opacity-0 transition-[max-width,opacity] duration-200 ease-out group-hover/timer:max-w-[200px] group-hover/timer:opacity-100">
          {controlButtons}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {controlButtons}
      <span
        className={`text-[13px] font-[family-name:var(--font-display)] font-semibold tabular-nums min-w-[52px] text-center select-none transition-colors duration-150 ${
          expired
            ? "text-[var(--red)] animate-pulse"
            : isCountdownDanger
              ? "text-[var(--yellow,var(--accent))]"
              : isRunning
                ? "text-[var(--text)]"
                : "text-[var(--text-muted)]"
        }`}
      >
        {displayTime}
      </span>
    </div>
  );
}

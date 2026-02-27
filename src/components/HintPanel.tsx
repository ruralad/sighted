"use client";

import { useState } from "react";

interface HintPanelProps {
  hints: [string, string, string];
}

export function HintPanel({ hints }: HintPanelProps) {
  const [revealed, setRevealed] = useState(0);

  const revealNext = () => {
    setRevealed((r) => Math.min(r + 1, 3));
  };

  return (
    <div className="bg-[var(--bg-deep)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-3.5 transition-colors duration-300">
      <div className="flex items-center justify-between mb-2.5 font-[family-name:var(--font-display)] font-semibold text-[13px] text-[var(--text-muted)]">
        <span>Hints</span>
        {revealed < 3 && (
          <button
            className="px-3 py-1.5 rounded-[var(--radius-sm)] font-[family-name:var(--font-display)] text-[11px] font-semibold bg-[var(--yellow-dim)] text-[var(--yellow)] border border-[rgba(234,179,8,0.25)] transition-[background-color,border-color,box-shadow] duration-200 ease-out cursor-pointer hover:bg-[rgba(234,179,8,0.2)] hover:border-[rgba(234,179,8,0.5)] hover:shadow-[0_0_12px_rgba(234,179,8,0.15)]"
            onClick={revealNext}
          >
            Show Hint {revealed + 1}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {hints.slice(0, revealed).map((hint, i) => (
          <div
            key={i}
            className="flex gap-3 text-[13px] leading-[1.65] text-[var(--text-secondary)] animate-fade-in-up-fast py-2 border-b border-[var(--border)] last:border-b-0 last:pb-0"
          >
            <span className="shrink-0 w-[22px] h-[22px] flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--yellow-dim)] text-[var(--yellow)] font-[family-name:var(--font-display)] text-[11px] font-bold border border-[rgba(234,179,8,0.2)]">
              {i + 1}
            </span>
            <p>{hint}</p>
          </div>
        ))}
        {revealed === 0 && (
          <p className="text-[13px] text-[var(--text-muted)] italic">
            Click the button above to reveal hints.
          </p>
        )}
      </div>
    </div>
  );
}

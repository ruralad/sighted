"use client";

interface ProgressBarProps {
  completed: number;
  total: number;
}

export function ProgressBar({ completed, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between text-[11px] text-[var(--text-muted)] mb-1.5 font-[family-name:var(--font-display)]">
        <span className="font-bold text-[var(--accent)] tabular-nums">
          {completed}/{total}
        </span>
        <span className="text-[var(--text-muted)] tabular-nums">{pct}%</span>
      </div>
      <div className="h-1 bg-[var(--bg-surface)] rounded-sm overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] rounded-sm transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_0_12px_var(--accent-glow)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

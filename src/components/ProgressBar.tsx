interface ProgressBarProps {
  completed: number;
  total: number;
}

export function ProgressBar({ completed, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="progress-bar">
      <div className="progress-bar__label">
        <span className="progress-bar__count">
          {completed}/{total}
        </span>
        <span className="progress-bar__pct">{pct}%</span>
      </div>
      <div className="progress-bar__track">
        <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

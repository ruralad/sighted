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
    <div className="hint-panel">
      <div className="hint-panel__header">
        <span>Hints</span>
        {revealed < 3 && (
          <button className="hint-panel__btn" onClick={revealNext}>
            Show Hint {revealed + 1}
          </button>
        )}
      </div>
      <div className="hint-panel__list">
        {hints.slice(0, revealed).map((hint, i) => (
          <div key={i} className="hint-panel__item">
            <span className="hint-panel__number">{i + 1}</span>
            <p>{hint}</p>
          </div>
        ))}
        {revealed === 0 && (
          <p className="hint-panel__empty">
            Click the button above to reveal hints.
          </p>
        )}
      </div>
    </div>
  );
}

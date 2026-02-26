import type { Question } from "../types/question";
import type { ReactNode } from "react";
import { HintPanel } from "./HintPanel";

// Splits on backtick-delimited segments and renders them as <code> elements
function renderInlineCode(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    return <span key={i}>{part}</span>;
  });
}

interface QuestionCardProps {
  question: Question;
  isCompleted: boolean;
  onToggleComplete: () => void;
}

export function QuestionCard({
  question,
  isCompleted,
  onToggleComplete,
}: QuestionCardProps) {
  const difficultyClass = `badge--${question.difficulty.toLowerCase()}`;

  return (
    <div className="question-card">
      <div className="question-card__header">
        <div className="question-card__title-row">
          <h2 className="question-card__title">{question.title}</h2>
          <button
            className={`btn-complete ${isCompleted ? "btn-complete--done" : ""}`}
            onClick={onToggleComplete}
          >
            {isCompleted ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: "middle" }}><polyline points="20 6 9 17 4 12" /></svg>
                Completed
              </>
            ) : "Mark Complete"}
          </button>
        </div>
        <div className="question-card__meta">
          <span className={`badge ${difficultyClass}`}>
            {question.difficulty}
          </span>
          <span className="badge badge--category">{question.category}</span>
        </div>
      </div>

      <div className="question-card__body">
        <div className="question-card__description">
          {question.description.split("\n").map((line, i) => (
            <p key={i}>{line ? renderInlineCode(line) : <br />}</p>
          ))}
        </div>

        <div className="question-card__examples">
          <h3>Examples</h3>
          {question.examples.map((ex, i) => (
            <div key={i} className="example">
              <div className="example__label">Example {i + 1}</div>
              <div className="example__content">
                <div className="example__row">
                  <span className="example__key">Input:</span>
                  <code>{ex.input}</code>
                </div>
                <div className="example__row">
                  <span className="example__key">Output:</span>
                  <code>{ex.output}</code>
                </div>
                {ex.explanation && (
                  <div className="example__row">
                    <span className="example__key">Explanation:</span>
                    <span>{ex.explanation}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <HintPanel key={question.id} hints={question.hints} />
      </div>
    </div>
  );
}

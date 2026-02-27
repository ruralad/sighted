"use client";

import type { Question } from "../types/question";
import type { ReactNode } from "react";
import { useEditorStore } from "../store/editorStore";
import { useCompletionStore } from "../store/completionStore";
import { HintPanel } from "./HintPanel";

function renderInlineCode(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="bg-[var(--accent-dim)] px-[7px] py-0.5 rounded-[var(--radius-sm)] font-[family-name:var(--font-mono)] text-[13px] text-[var(--accent)] border border-[var(--border-bright)]"
        >
          {part.slice(1, -1)}
        </code>
      );
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
  const showHints = useEditorStore((s) => s.settings.showHints);
  const showKeywords = useEditorStore((s) => s.settings.showKeywords);
  const stats = useCompletionStore((s) => s.stats);
  const qStats = stats.get(question.id);

  const difficultyColors: Record<string, string> = {
    easy: "bg-[var(--green-dim)] text-[var(--green)] border-[rgba(34,197,94,0.25)]",
    medium: "bg-[var(--yellow-dim)] text-[var(--yellow)] border-[rgba(234,179,8,0.25)]",
    hard: "bg-[var(--red-dim)] text-[var(--red)] border-[rgba(239,68,68,0.25)]",
  };

  return (
    <div className="p-6 animate-fade-in-up-dialog">
      {/* Header */}
      <div className="mb-6 pb-5 border-b border-[var(--border)]">
        <div className="flex items-start justify-between gap-4 mb-3.5">
          <h2 className="font-[family-name:var(--font-display)] text-[22px] font-bold tracking-[-0.02em] leading-[1.3] text-[var(--text)] text-balance">
            {question.id}. {question.title}
          </h2>
          <button
            className={`px-3.5 py-1.5 rounded-[var(--radius-md)] text-[12px] font-semibold border whitespace-nowrap cursor-pointer transition-[background-color,color,border-color,box-shadow] duration-200 ease-out ${
              isCompleted
                ? "bg-[var(--green-dim)] text-[var(--green)] border-[rgba(34,197,94,0.4)] animate-pulse-glow"
                : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-bright)] hover:border-[var(--green)] hover:text-[var(--green)] hover:bg-[var(--green-dim)]"
            }`}
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
        {showKeywords && (
          <div className="flex gap-2 flex-wrap items-center">
            <span
              className={`px-2.5 py-1 rounded-[var(--radius-sm)] font-[family-name:var(--font-display)] text-[11px] font-semibold uppercase tracking-[0.04em] border ${difficultyColors[question.difficulty.toLowerCase()] ?? ""}`}
            >
              {question.difficulty}
            </span>
            <span className="px-2.5 py-1 rounded-[var(--radius-sm)] font-[family-name:var(--font-display)] text-[11px] font-semibold uppercase tracking-[0.04em] border bg-[var(--blue-dim)] text-[var(--blue)] border-[rgba(59,130,246,0.25)]">
              {question.category}
            </span>
            {qStats && qStats.attempts > 0 ? (
              <span className="text-[11px] text-[var(--text-muted)] font-medium tabular-nums">
                {qStats.attempts} attempt{qStats.attempts !== 1 ? "s" : ""}
              </span>
            ) : null}
            {qStats && qStats.revisits > 0 ? (
              <span className="text-[11px] text-[var(--text-muted)] font-medium tabular-nums">
                {qStats.revisits} revisit{qStats.revisits !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-6">
        <div>
          {question.description.split("\n").map((line, i) => (
            <p key={i} className="leading-[1.75] text-[var(--text-secondary)] text-[14px]">
              {line ? renderInlineCode(line) : <br />}
            </p>
          ))}
        </div>

        <div>
          <h3 className="font-[family-name:var(--font-display)] text-[13px] font-semibold mb-3 text-[var(--text-muted)] uppercase tracking-[0.06em]">
            Examples
          </h3>
          {question.examples.map((ex, i) => (
            <div
              key={i}
              className="bg-[var(--bg-deep)] border border-[var(--border)] border-l-[3px] border-l-[var(--accent)] rounded-r-[var(--radius-md)] px-4 py-3.5 mb-2.5 transition-[border-color,background-color] duration-[200ms,300ms] ease-out hover:border-l-[var(--accent-hover)]"
            >
              <div className="font-[family-name:var(--font-display)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em] mb-2">
                Example {i + 1}
              </div>
              <div>
                <div className="flex gap-2.5 mb-1 text-[13px] leading-[1.6]">
                  <span className="font-semibold text-[var(--text-muted)] whitespace-nowrap min-w-[90px]">Input:</span>
                  <code className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--text)]">{ex.input}</code>
                </div>
                <div className="flex gap-2.5 mb-1 text-[13px] leading-[1.6]">
                  <span className="font-semibold text-[var(--text-muted)] whitespace-nowrap min-w-[90px]">Output:</span>
                  <code className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--text)]">{ex.output}</code>
                </div>
                {ex.explanation && (
                  <div className="flex gap-2.5 mb-1 text-[13px] leading-[1.6]">
                    <span className="font-semibold text-[var(--text-muted)] whitespace-nowrap min-w-[90px]">Explanation:</span>
                    <span className="text-[var(--text-secondary)]">{ex.explanation}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {showHints && <HintPanel key={question.id} hints={question.hints} />}
      </div>
    </div>
  );
}

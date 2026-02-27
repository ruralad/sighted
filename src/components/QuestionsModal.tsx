"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import questions from "../data/questions.json";
import type { Question } from "../types/question";
import { useCompletionStore } from "../store/completionStore";

const allQuestions = questions as Question[];

const closeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const checkIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

type SortKey = "id" | "title" | "difficulty" | "category" | "status";
type SortDir = "asc" | "desc";
type FilterDifficulty = "all" | "Easy" | "Medium" | "Hard";
type FilterStatus = "all" | "completed" | "pending";

const DIFFICULTY_ORDER: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };
const CATEGORIES = Array.from(new Set(allQuestions.map((q) => q.category))).sort();

const difficultyColors: Record<string, string> = {
  easy: "bg-[var(--green-dim)] text-[var(--green)] border-[rgba(34,197,94,0.25)]",
  medium: "bg-[var(--yellow-dim)] text-[var(--yellow)] border-[rgba(234,179,8,0.25)]",
  hard: "bg-[var(--red-dim)] text-[var(--red)] border-[rgba(239,68,68,0.25)]",
};

interface QuestionsModalProps {
  open: boolean;
  onClose: () => void;
  completed: Set<number>;
  currentQuestionId: number | null;
  onSelectQuestion: (id: number) => void;
}

export function QuestionsModal({
  open,
  onClose,
  completed,
  currentQuestionId,
  onSelectQuestion,
}: QuestionsModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterDifficulty, setFilterDifficulty] = useState<FilterDifficulty>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterCategory, setFilterCategory] = useState("all");

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

  useEffect(() => {
    if (open) {
      setSearch("");
      setFilterDifficulty("all");
      setFilterStatus("all");
      setFilterCategory("all");
    }
  }, [open]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  const filtered = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    let result = allQuestions.filter((q) => {
      if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) return false;
      if (filterCategory !== "all" && q.category !== filterCategory) return false;
      if (filterStatus === "completed" && !completed.has(q.id)) return false;
      if (filterStatus === "pending" && completed.has(q.id)) return false;
      if (lowerSearch) {
        const inTitle = q.title.toLowerCase().includes(lowerSearch);
        const inCategory = q.category.toLowerCase().includes(lowerSearch);
        const inKeywords = q.keywords.some((k) => k.toLowerCase().includes(lowerSearch));
        if (!inTitle && !inCategory && !inKeywords) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "id": cmp = a.id - b.id; break;
        case "title": cmp = a.title.localeCompare(b.title); break;
        case "difficulty": cmp = (DIFFICULTY_ORDER[a.difficulty] ?? 0) - (DIFFICULTY_ORDER[b.difficulty] ?? 0); break;
        case "category": cmp = a.category.localeCompare(b.category); break;
        case "status": {
          const aComp = completed.has(a.id) ? 1 : 0;
          const bComp = completed.has(b.id) ? 1 : 0;
          cmp = aComp - bComp;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [search, sortKey, sortDir, filterDifficulty, filterStatus, filterCategory, completed]);

  const completedCount = allQuestions.filter((q) => completed.has(q.id)).length;
  const stats = useCompletionStore((s) => s.stats);

  const handleRowClick = useCallback(
    (id: number) => {
      onSelectQuestion(id);
      onClose();
    },
    [onSelectQuestion, onClose],
  );

  if (!open) return null;

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return <span className="text-[9px] ml-1 text-[var(--accent)]">{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>;
  };

  const thClass = "sticky top-0 bg-[var(--bg-surface)] px-3 py-2.5 text-left font-[family-name:var(--font-display)] text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)] border-b border-[var(--border)] cursor-pointer select-none whitespace-nowrap z-[1] hover:text-[var(--text)]";
  const selectClass = "px-2.5 py-1.5 border border-[var(--border-bright)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[12px] font-[family-name:var(--font-body)] cursor-pointer outline-none transition-[border-color] duration-150 ease-out focus:border-[var(--accent)]";

  return (
    <div className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-[8px] flex items-center justify-center z-[100] animate-fade-in-fast" onClick={onClose}>
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border-bright)] rounded-[var(--radius-lg)] w-[min(92vw,960px)] max-h-[85vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-slide-up max-md:w-[98vw] max-md:max-h-[92vh]"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="All Questions"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[22px] py-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-baseline gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-[16px] font-bold text-[var(--text)] m-0">All Questions</h2>
            <span className="text-[13px] text-[var(--text-muted)] font-medium">{completedCount}/{allQuestions.length} completed</span>
          </div>
          <button
            className="flex items-center justify-center w-[30px] h-[30px] rounded-[var(--radius-md)] text-[var(--text-muted)] cursor-pointer transition-[color,background-color] duration-200 ease-out hover:text-[var(--text)] hover:bg-[var(--bg-primary)]"
            onClick={onClose}
            aria-label="Close"
          >
            {closeIcon}
          </button>
        </div>

        {/* Filters */}
        <div className="px-[22px] py-3 border-b border-[var(--border)] flex flex-col gap-2 shrink-0">
          <input
            className="w-full px-3 py-2 border border-[var(--border-bright)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] text-[var(--text)] text-[13px] font-[family-name:var(--font-body)] outline-none transition-[border-color] duration-150 ease-out placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            type="text"
            placeholder="Search by title, category, or keyword\u2026"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 flex-wrap max-md:flex-col">
            <select className={selectClass} value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value as FilterDifficulty)}>
              <option value="all">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <select className={selectClass} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className={selectClass} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}>
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1 min-h-0">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className={`${thClass} w-14 text-center`} onClick={() => handleSort("status")}>Status {sortIndicator("status")}</th>
                <th className={`${thClass} w-11`} onClick={() => handleSort("id")}># {sortIndicator("id")}</th>
                <th className={`${thClass} min-w-[200px]`} onClick={() => handleSort("title")}>Title {sortIndicator("title")}</th>
                <th className={`${thClass} w-[90px]`} onClick={() => handleSort("difficulty")}>Difficulty {sortIndicator("difficulty")}</th>
                <th className={`${thClass} w-[100px]`} onClick={() => handleSort("category")}>Category {sortIndicator("category")}</th>
                <th className={`${thClass} w-[70px] text-center max-md:hidden`}>Attempts</th>
                <th className={`${thClass} w-[160px] cursor-default hover:text-[var(--text-muted)] max-md:hidden`}>Keywords</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 px-3 text-[var(--text-muted)] italic">No questions match your filters.</td>
                </tr>
              ) : (
                filtered.map((q) => {
                  const isCompleted = completed.has(q.id);
                  const isCurrent = q.id === currentQuestionId;
                  const qStats = stats.get(q.id);
                  return (
                    <tr
                      key={q.id}
                      className={`cursor-pointer transition-colors duration-150 ease-out hover:bg-[var(--bg-elevated)] ${
                        isCurrent ? "bg-[var(--accent-dim)] hover:bg-[var(--accent-dim)]" : ""
                      } ${isCompleted ? "[&_td:nth-child(3)]:text-[var(--text-muted)]" : ""}`}
                      onClick={() => handleRowClick(q.id)}
                    >
                      <td className="px-3 py-2.5 border-b border-[var(--border)] text-[var(--text-secondary)] align-middle text-center">
                        {isCompleted ? (
                          <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-[var(--green-dim)] text-[var(--green)]">{checkIcon}</span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-[var(--border-bright)]" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 border-b border-[var(--border)] font-[family-name:var(--font-mono)] text-[12px] text-[var(--text-muted)] align-middle">{q.id}</td>
                      <td className="px-3 py-2.5 border-b border-[var(--border)] font-medium text-[var(--text)] align-middle">
                        {q.title}
                        {isCurrent ? (
                          <span className="inline-block ml-2 px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-semibold uppercase tracking-[0.04em] bg-[var(--accent-dim)] text-[var(--accent)] align-middle">
                            Current
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 border-b border-[var(--border)] text-[var(--text-secondary)] align-middle">
                        <span className={`px-2.5 py-1 rounded-[var(--radius-sm)] font-[family-name:var(--font-display)] text-[11px] font-semibold uppercase tracking-[0.04em] border ${difficultyColors[q.difficulty.toLowerCase()] ?? ""}`}>
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-[var(--border)] text-[var(--text-secondary)] align-middle">
                        <span className="px-2.5 py-1 rounded-[var(--radius-sm)] font-[family-name:var(--font-display)] text-[11px] font-semibold uppercase tracking-[0.04em] border bg-[var(--blue-dim)] text-[var(--blue)] border-[rgba(59,130,246,0.25)]">
                          {q.category}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-[var(--border)] text-center align-middle max-md:hidden">
                        {qStats && qStats.attempts > 0 ? (
                          <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--text-muted)] tabular-nums">{qStats.attempts}</span>
                        ) : (
                          <span className="text-[var(--text-muted)] text-[11px]">&mdash;</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 border-b border-[var(--border)] text-[var(--text-secondary)] align-middle max-md:hidden">
                        <span className="text-[11px] text-[var(--text-muted)] italic">{q.keywords.slice(0, 3).join(", ")}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-[22px] py-2.5 border-t border-[var(--border)] shrink-0">
          <span className="text-[12px] text-[var(--text-muted)]">Showing {filtered.length} of {allQuestions.length} questions</span>
        </div>
      </div>
    </div>
  );
}

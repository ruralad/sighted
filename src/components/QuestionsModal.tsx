import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import questions from "../data/questions.json";
import type { Question } from "../types/question";

const allQuestions = questions as Question[];

const closeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
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

  // Reset filters when modal opens
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
        case "id":
          cmp = a.id - b.id;
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "difficulty":
          cmp = (DIFFICULTY_ORDER[a.difficulty] ?? 0) - (DIFFICULTY_ORDER[b.difficulty] ?? 0);
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
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
    return <span className="qm-sort-arrow">{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>;
  };

  return (
    <div className="qm-overlay" onClick={onClose}>
      <div
        className="qm-panel"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="All Questions"
      >
        <div className="qm-header">
          <div className="qm-header__left">
            <h2 className="qm-header__title">All Questions</h2>
            <span className="qm-header__count">
              {completedCount}/{allQuestions.length} completed
            </span>
          </div>
          <button className="qm-header__close" onClick={onClose} aria-label="Close">
            {closeIcon}
          </button>
        </div>

        <div className="qm-filters">
          <input
            className="qm-search"
            type="text"
            placeholder="Search by title, category, or keyword\u2026"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="qm-filter-row">
            <select
              className="qm-select"
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value as FilterDifficulty)}
            >
              <option value="all">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <select
              className="qm-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              className="qm-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="qm-table-wrap">
          <table className="qm-table">
            <thead>
              <tr>
                <th className="qm-th qm-th--status" onClick={() => handleSort("status")}>
                  Status {sortIndicator("status")}
                </th>
                <th className="qm-th qm-th--id" onClick={() => handleSort("id")}>
                  # {sortIndicator("id")}
                </th>
                <th className="qm-th qm-th--title" onClick={() => handleSort("title")}>
                  Title {sortIndicator("title")}
                </th>
                <th className="qm-th qm-th--difficulty" onClick={() => handleSort("difficulty")}>
                  Difficulty {sortIndicator("difficulty")}
                </th>
                <th className="qm-th qm-th--category" onClick={() => handleSort("category")}>
                  Category {sortIndicator("category")}
                </th>
                <th className="qm-th qm-th--keywords">Keywords</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="qm-empty">No questions match your filters.</td>
                </tr>
              ) : (
                filtered.map((q) => {
                  const isCompleted = completed.has(q.id);
                  const isCurrent = q.id === currentQuestionId;
                  return (
                    <tr
                      key={q.id}
                      className={`qm-row ${isCompleted ? "qm-row--completed" : ""} ${isCurrent ? "qm-row--current" : ""}`}
                      onClick={() => handleRowClick(q.id)}
                    >
                      <td className="qm-td qm-td--status">
                        {isCompleted ? (
                          <span className="qm-check qm-check--done">{checkIcon}</span>
                        ) : (
                          <span className="qm-check qm-check--pending" />
                        )}
                      </td>
                      <td className="qm-td qm-td--id">{q.id}</td>
                      <td className="qm-td qm-td--title">
                        {q.title}
                        {isCurrent ? <span className="qm-current-badge">Current</span> : null}
                      </td>
                      <td className="qm-td qm-td--difficulty">
                        <span className={`badge badge--${q.difficulty.toLowerCase()}`}>
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="qm-td qm-td--category">
                        <span className="badge badge--category">{q.category}</span>
                      </td>
                      <td className="qm-td qm-td--keywords">
                        <span className="qm-keywords">
                          {q.keywords.slice(0, 3).join(", ")}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="qm-footer">
          <span className="qm-footer__showing">
            Showing {filtered.length} of {allQuestions.length} questions
          </span>
        </div>
      </div>
    </div>
  );
}

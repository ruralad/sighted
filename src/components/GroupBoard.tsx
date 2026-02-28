"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Clock, BarChart3 } from "lucide-react";
import type { BoardMemberStats, BoardSessionDetail } from "../store/groupStore";
import questions from "../data/questions.json";
import type { Question } from "../types/question";

const allQuestions = questions as Question[];

function formatTime(secs: number): string {
  if (secs === 0) return "\u2014";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function getQuestionTitle(id: number): string {
  const q = allQuestions.find((q) => q.id === id);
  return q ? `#${q.id} ${q.title}` : `#${id}`;
}

export function GroupBoard({
  board,
  sessions,
}: {
  board: BoardMemberStats[];
  sessions: BoardSessionDetail[];
}) {
  if (board.length === 0 && sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
        <BarChart3 size={28} className="text-[var(--text-muted)]" />
        <p className="text-[12px] text-[var(--text-muted)] leading-[1.6] max-w-[260px]">
          No sessions yet. Start a group session to see stats here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-5">
      {/* Member stats */}
      <div>
        <h3 className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Member Stats
        </h3>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Member
                </th>
                <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Sessions
                </th>
                <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Completed
                </th>
                <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Avg Time
                </th>
              </tr>
            </thead>
            <tbody>
              {board.map((member) => (
                <tr key={member.userId} className="border-b border-[var(--border)] last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[11px] font-bold shrink-0">
                        {member.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-[var(--text)]">
                          {member.displayName}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          @{member.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-[13px] font-semibold text-[var(--text)] tabular-nums">
                      {member.totalSessions}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-[13px] font-semibold text-green-400 tabular-nums">
                      {member.completions}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[13px] font-[family-name:var(--font-display)] font-semibold text-[var(--text)] tabular-nums">
                      {formatTime(member.avgTimeSecs)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session history */}
      {sessions.length > 0 ? (
        <div>
          <h3 className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
            Session History
          </h3>
          <div className="flex flex-col gap-2">
            {sessions.map((session) => (
              <SessionHistoryItem key={session.sessionId} session={session} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SessionHistoryItem({ session }: { session: BoardSessionDetail }) {
  const [expanded, setExpanded] = useState(false);

  const completedCount = session.results.filter((r) => r.completed).length;
  const totalParticipants = session.results.length;

  const date = useMemo(() => {
    const d = new Date(session.startedAt);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [session.startedAt]);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-primary)] overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-surface)]/50 transition-[background-color] duration-150"
        onClick={() => setExpanded((p) => !p)}
      >
        {expanded ? (
          <ChevronDown size={14} className="text-[var(--text-muted)] shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-[var(--text-muted)] shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium text-[var(--text)] truncate block">
            {getQuestionTitle(session.questionId)}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
            {date} \u00b7 {Math.floor(session.durationSecs / 60)}m \u00b7{" "}
            <span className={session.status === "active" ? "text-[var(--accent)]" : ""}>
              {session.status}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
            <CheckCircle2 size={12} className="text-green-400" />
            <span className="tabular-nums">{completedCount}/{totalParticipants}</span>
          </div>
        </div>
      </button>

      {expanded && session.results.length > 0 ? (
        <div className="border-t border-[var(--border)] bg-[var(--bg-surface)]">
          {session.results.map((r) => (
            <div
              key={r.userId}
              className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[10px] font-bold shrink-0">
                  {r.displayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-[12px] text-[var(--text)]">{r.displayName}</span>
              </div>
              <div className="flex items-center gap-3">
                {r.completed ? (
                  <CheckCircle2 size={13} className="text-green-400" />
                ) : (
                  <Clock size={13} className="text-[var(--text-muted)]" />
                )}
                <span className="text-[12px] font-[family-name:var(--font-display)] font-semibold text-[var(--text)] tabular-nums min-w-[50px] text-right">
                  {formatTime(r.timeSpentSecs)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {expanded && session.results.length === 0 ? (
        <div className="border-t border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
          <span className="text-[12px] text-[var(--text-muted)]">No submissions</span>
        </div>
      ) : null}
    </div>
  );
}

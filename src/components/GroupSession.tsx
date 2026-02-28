"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Clock, Users, Square, CheckCircle2, X, LogOut } from "lucide-react";
import { useGroupStore, type ActiveGroupSession } from "../store/groupStore";
import questions from "../data/questions.json";
import type { Question } from "../types/question";

const allQuestions = questions as Question[];

function formatCountdown(secs: number): string {
  if (secs <= 0) return "00:00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

/**
 * Thin banner rendered below the main header when a group session is active.
 * Provides countdown, submission count, submit/end controls.
 */
export function GroupSessionBanner({
  liveSession,
  submitted,
  onSubmit,
  submitting,
}: {
  liveSession: ActiveGroupSession;
  submitted: boolean;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const { session, group } = liveSession;
  const sessionResults = useGroupStore((s) => s.sessionResults);
  const endSession = useGroupStore((s) => s.endSession);
  const exitSession = useGroupStore((s) => s.exitSession);
  const refreshActiveSession = useGroupStore((s) => s.refreshActiveSession);

  const isAdmin = group.myRole === "admin";
  const [ending, setEnding] = useState(false);

  const question = useMemo(
    () => allQuestions.find((q) => q.id === session.questionId) ?? null,
    [session.questionId],
  );

  const [remaining, setRemaining] = useState(() => {
    const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 1000;
    return Math.max(0, session.durationSecs - Math.floor(elapsed));
  });

  const expired = remaining <= 0;
  const isCountdownDanger = remaining <= 60 && remaining > 0;

  useEffect(() => {
    if (expired) return;
    const id = setInterval(() => {
      const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 1000;
      const r = Math.max(0, session.durationSecs - Math.floor(elapsed));
      setRemaining(r);
      if (r <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [session.startedAt, session.durationSecs, expired]);

  useEffect(() => {
    const id = setInterval(() => {
      refreshActiveSession(group.id);
    }, 5000);
    return () => clearInterval(id);
  }, [refreshActiveSession, group.id]);

  const handleEnd = useCallback(async () => {
    setEnding(true);
    try {
      await endSession(session.id);
    } catch { /* error in store */ }
    setEnding(false);
  }, [endSession, session.id]);

  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (expired || session.status === "completed") {
      setShowResults(true);
    }
  }, [expired, session.status]);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-1.5 bg-[var(--accent)]/8 border-b border-[var(--accent)]/20 shrink-0 animate-fade-in">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-wider shrink-0">
            Group Session
          </span>
          <span className="text-[11px] text-[var(--text-muted)] truncate">
            {group.name}
            {question ? ` \u2014 #${question.id} ${question.title}` : ""}
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
            <Users size={11} />
            <span className="tabular-nums">
              {sessionResults.length}/{group.memberCount}
            </span>
          </div>

          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-sm)] text-[12px] font-bold tabular-nums font-[family-name:var(--font-display)] ${
              isCountdownDanger
                ? "bg-red-500/15 text-red-400"
                : "text-[var(--text)]"
            }`}
          >
            <Clock size={11} />
            {formatCountdown(remaining)}
          </div>

          {!submitted && !expired ? (
            <button
              className="px-2.5 py-1 rounded-[var(--radius-md)] text-[11px] font-semibold bg-[var(--accent)] text-[var(--accent-text-on)] transition-[background-color] duration-150 hover:bg-[var(--accent-hover)] disabled:opacity-50"
              onClick={onSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting\u2026" : "Submit"}
            </button>
          ) : submitted ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-green-400">
              <CheckCircle2 size={12} />
              Submitted
            </span>
          ) : null}

          {isAdmin && !expired ? (
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-[var(--radius-md)] text-[10px] font-semibold text-[var(--red)] bg-[var(--red)]/10 hover:bg-[var(--red)]/20 transition-[background-color] duration-150 disabled:opacity-50"
              onClick={handleEnd}
              disabled={ending}
            >
              <Square size={9} />
              End
            </button>
          ) : null}

          <button
            className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-[color,background-color] duration-150"
            onClick={exitSession}
            aria-label="Leave session view"
            title="Leave session view"
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>

      {showResults ? (
        <SessionResultsModal
          liveSession={liveSession}
          onClose={() => {
            setShowResults(false);
            exitSession();
          }}
        />
      ) : null}
    </>
  );
}

// ── Session Results Modal ────────────────────────────────────

function SessionResultsModal({
  liveSession,
  onClose,
}: {
  liveSession: ActiveGroupSession;
  onClose: () => void;
}) {
  const { session, group } = liveSession;
  const sessionResults = useGroupStore((s) => s.sessionResults);
  const endSession = useGroupStore((s) => s.endSession);
  const isAdmin = group.myRole === "admin";
  const [ending, setEnding] = useState(false);

  const question = useMemo(
    () => allQuestions.find((q) => q.id === session.questionId) ?? null,
    [session.questionId],
  );

  const handleEnd = useCallback(async () => {
    setEnding(true);
    try {
      await endSession(session.id);
    } catch { /* error in store */ }
    setEnding(false);
  }, [endSession, session.id]);

  return (
    <div
      className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-[6px] flex items-center justify-center z-[100] animate-fade-in-fast overscroll-contain"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-primary)] border border-[var(--border-bright)] rounded-[var(--radius-lg)] w-[520px] max-h-[80vh] shadow-[var(--shadow-dialog)] animate-fade-in-up-dialog flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <div>
            <h3 className="text-[15px] font-bold text-[var(--text)] font-[family-name:var(--font-display)]">
              Session Results
            </h3>
            {question ? (
              <span className="text-[11px] text-[var(--text-muted)]">
                #{question.id} {question.title} \u2014 {group.name}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && session.status === "active" ? (
              <button
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-md)] text-[11px] font-semibold text-[var(--red)] bg-[var(--red)]/10 hover:bg-[var(--red)]/20 transition-[background-color] duration-150 disabled:opacity-50"
                onClick={handleEnd}
                disabled={ending}
              >
                <Square size={11} />
                {ending ? "Ending\u2026" : "End Session"}
              </button>
            ) : null}
            <button
              className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-[color,background-color] duration-200"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Member
                  </th>
                  <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.members.map((member) => {
                  const res = sessionResults.find((r) => r.userId === member.userId);
                  return (
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
                      <td className="px-4 py-3 text-center">
                        {res ? (
                          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-green-400">
                            <CheckCircle2 size={13} />
                            Completed
                          </span>
                        ) : (
                          <span className="text-[12px] text-[var(--text-muted)]">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {res ? (
                          <span className="text-[13px] font-[family-name:var(--font-display)] font-semibold text-[var(--text)] tabular-nums">
                            {formatTime(res.timeSpentSecs)}
                          </span>
                        ) : (
                          <span className="text-[12px] text-[var(--text-muted)]">\u2014</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

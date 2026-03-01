"use client";

import { create } from "zustand";
import {
  getCompleted,
  markCompleted,
  unmarkCompleted,
  resetProgress as dbResetProgress,
} from "./db";
import {
  getProgress,
  syncProgress,
  recordAttempt as serverRecordAttempt,
  recordRevisit as serverRecordRevisit,
  bulkSyncProgress,
} from "../../app/actions/progress";
import { useAuthStore } from "./authStore";

interface QuestionStats {
  attempts: number;
  revisits: number;
  completedAt: string | null;
  lastVisitedAt: string | null;
}

interface CompletionStore {
  completed: Set<number>;
  stats: Map<number, QuestionStats>;
  loading: boolean;
  hydrate: () => Promise<void>;
  toggleComplete: (questionId: number) => void;
  resetProgress: () => Promise<void>;
  recordAttempt: (questionId: number) => void;
  recordRevisit: (questionId: number) => void;
}

let didHydrate = false;

function defaultStats(): QuestionStats {
  return { attempts: 0, revisits: 0, completedAt: null, lastVisitedAt: null };
}

export const useCompletionStore = create<CompletionStore>(
  (setState, getState) => ({
    completed: new Set(),
    stats: new Map(),
    loading: true,

    hydrate: async () => {
      if (didHydrate) return;
      didHydrate = true;

      const localCompleted = await getCompleted();
      const isAuth = useAuthStore.getState().isAuthenticated;

      if (isAuth) {
        const serverData = await getProgress();
        if (serverData) {
          const merged = new Set(localCompleted);
          const statsMap = new Map<number, QuestionStats>();

          for (const row of serverData) {
            if (row.completed) merged.add(row.questionId);
            statsMap.set(row.questionId, {
              attempts: row.attempts,
              revisits: row.revisits,
              completedAt: row.completedAt,
              lastVisitedAt: row.lastVisitedAt,
            });
          }

          // Upload any local-only completions to server
          const localOnly = [...localCompleted].filter(
            (id) => !serverData.some((r) => r.questionId === id && r.completed),
          );
          if (localOnly.length > 0) {
            bulkSyncProgress(
              localOnly.map((id) => ({
                questionId: id,
                completed: true,
                completedAt: new Date().toISOString(),
              })),
            ).catch(() => {});
          }

          setState({ completed: merged, stats: statsMap, loading: false });
          return;
        }
      }

      setState({ completed: localCompleted, loading: false });
    },

    toggleComplete: (questionId: number) => {
      const { completed, stats } = getState();
      const next = new Set(completed);
      const nextStats = new Map(stats);
      const isAuth = useAuthStore.getState().isAuthenticated;

      if (next.has(questionId)) {
        next.delete(questionId);
        unmarkCompleted(questionId);
        const s = nextStats.get(questionId) ?? defaultStats();
        nextStats.set(questionId, { ...s, completedAt: null });
        if (isAuth) {
          syncProgress(questionId, {
            completed: false,
            completedAt: null,
          }).catch(() => {});
        }
      } else {
        next.add(questionId);
        markCompleted(questionId);
        const now = new Date().toISOString();
        const s = nextStats.get(questionId) ?? defaultStats();
        nextStats.set(questionId, { ...s, completedAt: now });
        if (isAuth) {
          syncProgress(questionId, {
            completed: true,
            completedAt: now,
          }).catch(() => {});
        }
      }
      setState({ completed: next, stats: nextStats });
    },

    resetProgress: async () => {
      await dbResetProgress();
      setState({ completed: new Set(), stats: new Map() });
    },

    recordAttempt: (questionId: number) => {
      const { stats } = getState();
      const nextStats = new Map(stats);
      const s = nextStats.get(questionId) ?? defaultStats();
      nextStats.set(questionId, {
        ...s,
        attempts: s.attempts + 1,
        lastVisitedAt: new Date().toISOString(),
      });
      setState({ stats: nextStats });

      if (useAuthStore.getState().isAuthenticated) {
        serverRecordAttempt(questionId).catch(() => {});
      }
    },

    recordRevisit: (questionId: number) => {
      const { stats } = getState();
      const nextStats = new Map(stats);
      const s = nextStats.get(questionId) ?? defaultStats();
      nextStats.set(questionId, {
        ...s,
        revisits: s.revisits + 1,
        lastVisitedAt: new Date().toISOString(),
      });
      setState({ stats: nextStats });

      if (useAuthStore.getState().isAuthenticated) {
        serverRecordRevisit(questionId).catch(() => {});
      }
    },
  }),
);

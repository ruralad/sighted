import { create } from "zustand";
import {
  getCompleted,
  markCompleted,
  unmarkCompleted,
  resetProgress as dbResetProgress,
} from "./db";

interface CompletionStore {
  completed: Set<number>;
  loading: boolean;
  hydrate: () => Promise<void>;
  toggleComplete: (questionId: number) => void;
  resetProgress: () => Promise<void>;
}

let didHydrate = false;

export const useCompletionStore = create<CompletionStore>((setState, getState) => ({
  completed: new Set(),
  loading: true,

  hydrate: async () => {
    if (didHydrate) return;
    didHydrate = true;

    const completed = await getCompleted();
    setState({ completed, loading: false });
  },

  // Optimistic update: UI updates immediately, DB write is fire-and-forget
  toggleComplete: (questionId: number) => {
    const { completed } = getState();
    const next = new Set(completed);
    if (next.has(questionId)) {
      next.delete(questionId);
      unmarkCompleted(questionId);
    } else {
      next.add(questionId);
      markCompleted(questionId);
    }
    setState({ completed: next });
  },

  resetProgress: async () => {
    await dbResetProgress();
    setState({ completed: new Set() });
  },
}));

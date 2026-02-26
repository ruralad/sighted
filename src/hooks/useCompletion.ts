import { useState, useEffect, useCallback } from "react";
import {
  getCompleted,
  markCompleted,
  unmarkCompleted,
  resetProgress as dbResetProgress,
} from "../store/db";

export function useCompletion() {
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompleted().then((c) => {
      setCompleted(c);
      setLoading(false);
    });
  }, []);

  const toggleComplete = useCallback(async (questionId: number) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
        unmarkCompleted(questionId);
      } else {
        next.add(questionId);
        markCompleted(questionId);
      }
      return next;
    });
  }, []);

  const resetProgress = useCallback(async () => {
    await dbResetProgress();
    setCompleted(new Set());
  }, []);

  return { completed, loading, toggleComplete, resetProgress };
}

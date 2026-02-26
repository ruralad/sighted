import { useState, useCallback, useEffect } from "react";
import type { Language, StoredSolution } from "../types/question";
import { getSolution, saveSolution } from "../store/db";

export function useSolution(questionId: number | null) {
  const [lastSolution, setLastSolution] = useState<StoredSolution | null>(null);

  useEffect(() => {
    if (questionId === null) {
      setLastSolution(null);
      return;
    }
    getSolution(questionId).then(setLastSolution);
  }, [questionId]);

  const save = useCallback(
    async (language: Language, code: string) => {
      if (questionId === null) return;
      await saveSolution(questionId, language, code);
      setLastSolution({ language, code, timestamp: Date.now() });
    },
    [questionId],
  );

  return { lastSolution, save };
}

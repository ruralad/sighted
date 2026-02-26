import { useState, useCallback, useEffect } from "react";
import questions from "../data/questions.json";
import type { Question } from "../types/question";
import { getCurrentQuestion, setCurrentQuestion } from "../store/db";

const allQuestions = questions as Question[];

function pickRandom(exclude: Set<number>): Question | null {
  const available = allQuestions.filter((q) => !exclude.has(q.id));
  if (available.length === 0) return null;
  const idx = Math.floor(Math.random() * available.length);
  return available[idx]!;
}

export function useQuestion(completed: Set<number>, completionLoaded: boolean) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!completionLoaded) return;

    getCurrentQuestion().then((savedId) => {
      if (savedId !== null) {
        const found = allQuestions.find((q) => q.id === savedId);
        if (found && !completed.has(found.id)) {
          setQuestion(found);
          setLoading(false);
          return;
        }
      }
      const picked = pickRandom(completed);
      setQuestion(picked);
      if (picked) setCurrentQuestion(picked.id);
      setLoading(false);
    });
  }, [completionLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextQuestion = useCallback(() => {
    const picked = pickRandom(completed);
    setQuestion(picked);
    if (picked) {
      setCurrentQuestion(picked.id);
    } else {
      setCurrentQuestion(null);
    }
  }, [completed]);

  const totalQuestions = allQuestions.length;

  return { question, loading, nextQuestion, totalQuestions };
}

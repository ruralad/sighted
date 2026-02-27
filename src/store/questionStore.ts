"use client";

import { create } from "zustand";
import questions from "../data/questions.json";
import type { Question } from "../types/question";
import { getCurrentQuestion, setCurrentQuestion } from "./db";
import { useCompletionStore } from "./completionStore";

const allQuestions = questions as Question[];

function pickRandom(exclude: Set<number>): Question | null {
  const available = allQuestions.filter((q) => !exclude.has(q.id));
  if (available.length === 0) return null;
  const idx = Math.floor(Math.random() * available.length);
  return available[idx]!;
}

interface QuestionStore {
  question: Question | null;
  loading: boolean;
  totalQuestions: number;
  hydrate: (completed: Set<number>) => Promise<void>;
  nextQuestion: (completed: Set<number>) => void;
  randomQuestion: () => void;
  selectQuestion: (id: number) => void;
}

let didHydrate = false;

export const useQuestionStore = create<QuestionStore>((setState) => ({
  question: null,
  loading: true,
  totalQuestions: allQuestions.length,

  // Restores the last active question from IndexedDB, or picks a new random one.
  // Requires the completed set so it can skip already-finished questions.
  hydrate: async (completed: Set<number>) => {
    if (didHydrate) return;
    didHydrate = true;

    const savedId = await getCurrentQuestion();
    if (savedId !== null) {
      const found = allQuestions.find((q) => q.id === savedId);
      if (found && !completed.has(found.id)) {
        setState({ question: found, loading: false });
        return;
      }
    }
    const picked = pickRandom(completed);
    setState({ question: picked, loading: false });
    if (picked) setCurrentQuestion(picked.id);
  },

  nextQuestion: (completed: Set<number>) => {
    const picked = pickRandom(completed);
    setState({ question: picked });
    if (picked) {
      setCurrentQuestion(picked.id);
    } else {
      setCurrentQuestion(null);
    }
  },

  randomQuestion: () => {
    const current = useQuestionStore.getState().question;
    const pool = allQuestions.filter((q) => q.id !== current?.id);
    if (pool.length === 0) return;
    const picked = pool[Math.floor(Math.random() * pool.length)]!;
    setState({ question: picked });
    setCurrentQuestion(picked.id);
  },

  selectQuestion: (id: number) => {
    const current = useQuestionStore.getState().question;
    const found = allQuestions.find((q) => q.id === id);
    if (found) {
      setState({ question: found });
      setCurrentQuestion(found.id);
      if (current && found.id !== current.id) {
        useCompletionStore.getState().recordRevisit(found.id);
      }
    }
  },
}));

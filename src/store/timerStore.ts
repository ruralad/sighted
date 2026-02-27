"use client";

import { create } from "zustand";

type TimerMode = "stopwatch" | "countdown";

const DEFAULT_COUNTDOWN = 30 * 60;

interface TimerState {
  mode: TimerMode;
  elapsed: number;
  countdownTotal: number;
  remaining: number;
  isRunning: boolean;
  expired: boolean;
  questionId: number | null;
}

interface TimerActions {
  tick: () => void;
  toggleRunning: () => void;
  reset: () => void;
  switchMode: () => void;
  selectPreset: (seconds: number) => void;
  resetForQuestion: (questionId: number | null) => void;
}

export const useTimerStore = create<TimerState & TimerActions>((set, get) => ({
  mode: "stopwatch",
  elapsed: 0,
  countdownTotal: DEFAULT_COUNTDOWN,
  remaining: DEFAULT_COUNTDOWN,
  isRunning: false,
  expired: false,
  questionId: null,

  tick: () => {
    const { mode, isRunning } = get();
    if (!isRunning) return;
    if (mode === "stopwatch") {
      set((s) => ({ elapsed: s.elapsed + 1 }));
    } else {
      set((s) => {
        if (s.remaining <= 1) {
          return { remaining: 0, isRunning: false, expired: true };
        }
        return { remaining: s.remaining - 1 };
      });
    }
  },

  toggleRunning: () => {
    const { mode, remaining, isRunning, countdownTotal } = get();
    if (mode === "countdown" && remaining === 0 && !isRunning) {
      set({ remaining: countdownTotal, expired: false, isRunning: true });
      return;
    }
    set({ isRunning: !isRunning });
  },

  reset: () => {
    const { countdownTotal } = get();
    set({ isRunning: false, elapsed: 0, remaining: countdownTotal, expired: false });
  },

  switchMode: () => {
    const { countdownTotal } = get();
    set((s) => ({
      mode: s.mode === "stopwatch" ? "countdown" : "stopwatch",
      isRunning: false,
      elapsed: 0,
      remaining: countdownTotal,
      expired: false,
    }));
  },

  selectPreset: (seconds: number) => {
    set({ countdownTotal: seconds, remaining: seconds, isRunning: false, expired: false });
  },

  resetForQuestion: (questionId: number | null) => {
    const { questionId: current, countdownTotal } = get();
    if (questionId === current) return;
    set({
      questionId,
      isRunning: false,
      elapsed: 0,
      remaining: countdownTotal,
      expired: false,
    });
  },
}));

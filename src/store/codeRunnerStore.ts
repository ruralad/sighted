"use client";

import { create } from "zustand";
import type { Language } from "../types/question";
import { runJavaScript } from "../runners/jsRunner";
import { runPython } from "../runners/pythonRunner";
import { runGo } from "../runners/goRunner";
import { runJava } from "../runners/javaRunner";

export interface RunResult {
  output: string;
  error: string | null;
  duration: number;
}

interface CodeRunnerStore {
  running: boolean;
  result: RunResult | null;
  pyodideLoading: boolean;
  run: (language: Language, code: string) => Promise<void>;
  clearResult: () => void;
}

export const useCodeRunnerStore = create<CodeRunnerStore>((setState) => ({
  running: false,
  result: null,
  pyodideLoading: false,

  run: async (language: Language, code: string) => {
    setState({ running: true, result: null });

    const start = performance.now();
    let res: RunResult;

    try {
      switch (language) {
        case "javascript":
          res = await runJavaScript(code);
          break;
        case "python":
          setState({ pyodideLoading: true });
          res = await runPython(code);
          setState({ pyodideLoading: false });
          break;
        case "go":
          res = runGo();
          break;
        case "java":
          res = runJava();
          break;
        default:
          res = { output: "", error: "Unsupported language", duration: 0 };
      }
    } catch (e) {
      res = {
        output: "",
        error: e instanceof Error ? e.message : String(e),
        duration: performance.now() - start,
      };
    }

    // Override duration with wall-clock time (runner-reported duration excludes overhead)
    res.duration = Math.round(performance.now() - start);
    setState({ result: res, running: false });
  },

  clearResult: () => setState({ result: null }),
}));

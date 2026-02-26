import { useState, useCallback } from "react";
import type { Language } from "../types/question";
import { runJavaScript } from "../runners/jsRunner";
import { runPython } from "../runners/pythonRunner";
import { runGo } from "../runners/goRunner";

export interface RunResult {
  output: string;
  error: string | null;
  duration: number;
}

export function useCodeRunner() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [pyodideLoading, setPyodideLoading] = useState(false);

  const run = useCallback(async (language: Language, code: string) => {
    setRunning(true);
    setResult(null);

    const start = performance.now();
    let res: RunResult;

    try {
      switch (language) {
        case "javascript":
          res = await runJavaScript(code);
          break;
        case "python":
          setPyodideLoading(true);
          res = await runPython(code);
          setPyodideLoading(false);
          break;
        case "go":
          res = runGo();
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

    res.duration = Math.round(performance.now() - start);
    setResult(res);
    setRunning(false);
  }, []);

  const clearResult = useCallback(() => setResult(null), []);

  return { running, result, pyodideLoading, run, clearResult };
}

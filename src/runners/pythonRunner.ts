"use client";

import type { RunResult } from "../store/codeRunnerStore";

// Pyodide is ~15MB — lazy-loaded on first Python run and cached for subsequent runs.
// Two guards prevent duplicate loads: the resolved instance and the in-flight promise.
let pyodideInstance: unknown = null;
let loadingPromise: Promise<unknown> | null = null;

async function loadPyodide(): Promise<unknown> {
  if (pyodideInstance) return pyodideInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js";

    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Pyodide"));
      document.head.appendChild(script);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loadFn = (globalThis as any)["loadPyodide"] as () => Promise<unknown>;
    const pyo = await loadFn();
    pyodideInstance = pyo;
    return pyo;
  })();

  return loadingPromise;
}

export async function runPython(code: string): Promise<RunResult> {
  const start = performance.now();

  try {
    const pyodide = (await loadPyodide()) as {
      runPython: (code: string) => unknown;
      setStdout: (opts: { batched: (text: string) => void }) => void;
      setStderr: (opts: { batched: (text: string) => void }) => void;
    };

    const output: string[] = [];
    const errors: string[] = [];

    pyodide.setStdout({
      batched: (text: string) => output.push(text),
    });
    pyodide.setStderr({
      batched: (text: string) => errors.push(text),
    });

    pyodide.runPython(code);

    return {
      output: output.join("\n"),
      error: errors.length > 0 ? errors.join("\n") : null,
      duration: performance.now() - start,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Pyodide wraps Python tracebacks in verbose JS errors — extract just the last 2 lines
    const cleanMsg = msg.includes("PythonError")
      ? msg.split("\n").slice(-2).join("\n")
      : msg;
    return {
      output: "",
      error: cleanMsg,
      duration: performance.now() - start,
    };
  }
}

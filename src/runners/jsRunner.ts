import type { RunResult } from "../hooks/useCodeRunner";

export async function runJavaScript(code: string): Promise<RunResult> {
  const logs: string[] = [];
  const start = performance.now();

  try {
    const fn = new Function(
      "console",
      `"use strict";
      const __logs = [];
      const console = {
        log: (...args) => __logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
        error: (...args) => __logs.push('ERROR: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
        warn: (...args) => __logs.push('WARN: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      };
      ${code}
      return __logs;`,
    );

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Execution timed out (5s limit)")), 5000),
    );

    const execution = new Promise<string[]>((resolve) => {
      const result = fn();
      resolve(Array.isArray(result) ? result : []);
    });

    const result = await Promise.race([execution, timeout]);
    logs.push(...result);

    return {
      output: logs.join("\n"),
      error: null,
      duration: performance.now() - start,
    };
  } catch (e) {
    return {
      output: logs.join("\n"),
      error: e instanceof Error ? e.message : String(e),
      duration: performance.now() - start,
    };
  }
}

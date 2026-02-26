import type { RunResult } from "../hooks/useCodeRunner";

export function runGo(): RunResult {
  return {
    output: "",
    error:
      "Go execution is not supported in the browser.\nCopy your code to a local Go environment to test.",
    duration: 0,
  };
}

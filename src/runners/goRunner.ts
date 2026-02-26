import type { RunResult } from "../store/codeRunnerStore";

export function runGo(): RunResult {
  return {
    output: "",
    error:
      "Go execution is not supported in the browser.\nCopy your code to a local Go environment to test.",
    duration: 0,
  };
}

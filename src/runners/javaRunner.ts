"use client";

import type { RunResult } from "../store/codeRunnerStore";

export function runJava(): RunResult {
  return {
    output: "",
    error:
      "Java execution is not supported in the browser.\nCopy your code to a local JDK environment to test.",
    duration: 0,
  };
}

"use client";

import type { RunResult } from "../store/codeRunnerStore";

interface OutputPanelProps {
  result: RunResult | null;
  running: boolean;
  pyodideLoading: boolean;
}

export function OutputPanel({
  result,
  running,
  pyodideLoading,
}: OutputPanelProps) {
  return (
    <div className="h-[180px] shrink-0 border-t-2 border-[var(--border)] flex flex-col">
      <div className="flex items-center justify-between px-3.5 py-2 font-[family-name:var(--font-display)] font-semibold text-[12px] text-[var(--text-muted)] bg-[var(--bg-primary)] border-b border-[var(--border)] uppercase tracking-[0.04em] transition-colors duration-300">
        <span>Output</span>
        {result && !running && (
          <span className="font-[family-name:var(--font-display)] text-[11px] text-[var(--text-muted)] font-normal tabular-nums">
            {result.duration}ms
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3.5 py-3 bg-[var(--bg-deep)] transition-colors duration-300">
        {running && (
          <div className="output-spinner text-[var(--yellow)] text-[13px] flex items-center gap-2.5 font-medium">
            {pyodideLoading
              ? "Loading Python runtime\u2026"
              : "Running\u2026"}
          </div>
        )}
        {!running && !result && (
          <div className="text-[var(--text-muted)] text-[13px] italic">
            Run your code to see output here.
          </div>
        )}
        {!running && result && (
          <>
            {result.output && (
              <pre className="font-[family-name:var(--font-mono)] text-[13px] leading-[1.7] whitespace-pre-wrap break-all text-[var(--green)]">
                {result.output}
              </pre>
            )}
            {result.error && (
              <pre className="font-[family-name:var(--font-mono)] text-[13px] leading-[1.7] whitespace-pre-wrap break-all text-[var(--red)]">
                {result.error}
              </pre>
            )}
            {!result.output && !result.error && (
              <div className="text-[var(--text-muted)] text-[13px] italic">
                No output produced.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

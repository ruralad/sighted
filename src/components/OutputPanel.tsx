import type { RunResult } from "../hooks/useCodeRunner";

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
    <div className="output-panel">
      <div className="output-panel__header">
        <span>Output</span>
        {result && !running && (
          <span className="output-panel__time">{result.duration}ms</span>
        )}
      </div>
      <div className="output-panel__body">
        {running && (
          <div className="output-panel__status">
            {pyodideLoading
              ? "Loading Python runtime..."
              : "Running..."}
          </div>
        )}
        {!running && !result && (
          <div className="output-panel__placeholder">
            Run your code to see output here.
          </div>
        )}
        {!running && result && (
          <>
            {result.output && (
              <pre className="output-panel__stdout">{result.output}</pre>
            )}
            {result.error && (
              <pre className="output-panel__stderr">{result.error}</pre>
            )}
            {!result.output && !result.error && (
              <div className="output-panel__placeholder">
                No output produced.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

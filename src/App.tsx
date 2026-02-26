import { useState, useCallback, useRef, useEffect } from "react";
import type { Language } from "./types/question";
import { useCompletion } from "./hooks/useCompletion";
import { useQuestion } from "./hooks/useQuestion";
import { useSolution } from "./hooks/useSolution";
import { useCodeRunner } from "./hooks/useCodeRunner";
import { ProgressBar } from "./components/ProgressBar";
import { QuestionCard } from "./components/QuestionCard";
import { LanguageSelector } from "./components/LanguageSelector";
import { CodeEditor } from "./components/CodeEditor";
import { OutputPanel } from "./components/OutputPanel";

export function App() {
  const { completed, loading: compLoading, toggleComplete, resetProgress } = useCompletion();
  const { question, loading: qLoading, nextQuestion, totalQuestions } = useQuestion(completed, !compLoading);
  const { save } = useSolution(question?.id ?? null);
  const { running, result, pyodideLoading, run, clearResult } = useCodeRunner();

  const [language, setLanguage] = useState<Language>("javascript");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const codeRef = useRef("");

  const scaffoldCode = question?.scaffolds[language] ?? "";

  useEffect(() => {
    codeRef.current = scaffoldCode;
  }, [scaffoldCode]);

  const editorKey = question ? `${question.id}-${language}` : "empty";

  const handleCodeChange = useCallback((code: string) => {
    codeRef.current = code;
  }, []);

  const handleRun = useCallback(() => {
    if (!codeRef.current) return;
    run(language, codeRef.current);
  }, [language, run]);

  const handleSubmit = useCallback(async () => {
    if (!codeRef.current || !question) return;
    await save(language, codeRef.current);
    run(language, codeRef.current);
  }, [language, run, save, question]);

  const handleNext = useCallback(() => {
    clearResult();
    codeRef.current = "";
    nextQuestion();
  }, [nextQuestion, clearResult]);

  const handleLanguageChange = useCallback(
    (lang: Language) => {
      setLanguage(lang);
      clearResult();
    },
    [clearResult],
  );

  const handleReset = useCallback(async () => {
    await resetProgress();
    setShowResetConfirm(false);
    clearResult();
    codeRef.current = "";
    window.location.reload();
  }, [resetProgress, clearResult]);

  if (compLoading || qLoading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Loading questions...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="app-done">
        <div className="app-done__content">
          <h1>All Done!</h1>
          <p>
            You've completed all {totalQuestions} questions. Amazing work!
          </p>
          <button className="btn btn--primary" onClick={() => setShowResetConfirm(true)}>
            Reset Progress
          </button>
          {showResetConfirm && (
            <div className="confirm-overlay">
              <div className="confirm-dialog">
                <p>Reset all progress? This cannot be undone.</p>
                <div className="confirm-dialog__actions">
                  <button className="btn btn--danger" onClick={handleReset}>
                    Yes, Reset
                  </button>
                  <button className="btn btn--secondary" onClick={() => setShowResetConfirm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <h1>Blind 75</h1>
        </div>
        <div className="topbar__center">
          <ProgressBar completed={completed.size} total={totalQuestions} />
        </div>
        <div className="topbar__actions">
          <button className="btn btn--secondary" onClick={handleNext}>
            Next Question
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => setShowResetConfirm(true)}
          >
            Reset
          </button>
        </div>
      </header>

      <main className="split-layout">
        <div className="split-layout__left">
          <QuestionCard
            question={question}
            isCompleted={completed.has(question.id)}
            onToggleComplete={() => toggleComplete(question.id)}
          />
        </div>

        <div className="split-layout__right">
          <div className="editor-section">
            <div className="editor-section__header">
              <LanguageSelector language={language} onChange={handleLanguageChange} />
              <div className="editor-section__actions">
                <button
                  className="btn btn--secondary"
                  onClick={handleRun}
                  disabled={running}
                >
                  {running ? "Running..." : "Run"}
                </button>
                <button
                  className="btn btn--primary"
                  onClick={handleSubmit}
                  disabled={running}
                >
                  Submit
                </button>
              </div>
            </div>
            <CodeEditor
              key={editorKey}
              language={language}
              initialCode={scaffoldCode}
              onCodeChange={handleCodeChange}
              onRun={handleRun}
            />
          </div>
          <OutputPanel result={result} running={running} pyodideLoading={pyodideLoading} />
        </div>
      </main>

      {showResetConfirm && (
        <div className="confirm-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p>Reset all progress? This cannot be undone.</p>
            <div className="confirm-dialog__actions">
              <button className="btn btn--danger" onClick={handleReset}>
                Yes, Reset
              </button>
              <button className="btn btn--secondary" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

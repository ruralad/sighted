import { useState, useCallback, useRef, useEffect } from "react";
import type { Language } from "./types/question";
import { useThemeStore } from "./store/themeStore";
import { useCompletionStore } from "./store/completionStore";
import { useQuestionStore } from "./store/questionStore";
import { useCodeRunnerStore } from "./store/codeRunnerStore";
import { useEditorStore } from "./store/editorStore";
import { saveSolution } from "./store/db";
import { ProgressBar } from "./components/ProgressBar";
import { QuestionCard } from "./components/QuestionCard";
import { LanguageSelector } from "./components/LanguageSelector";
import { CodeEditor } from "./components/CodeEditor";
import { OutputPanel } from "./components/OutputPanel";
import { SettingsModal } from "./components/SettingsModal";
import { QuestionsModal } from "./components/QuestionsModal";

// Hoisted outside component to avoid re-creating SVG elements on every render
const listIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const gearIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const loadingSpinner = (
  <div className="app-loading">
    <div className="spinner" />
  </div>
);

export function App() {
  const themeLoaded = useThemeStore((s) => s.loaded);
  const hydrateTheme = useThemeStore((s) => s.hydrate);

  const completionLoading = useCompletionStore((s) => s.loading);
  const hydrateCompletion = useCompletionStore((s) => s.hydrate);

  const questionLoading = useQuestionStore((s) => s.loading);
  const hydrateQuestion = useQuestionStore((s) => s.hydrate);

  const editorLoaded = useEditorStore((s) => s.loaded);
  const hydrateEditor = useEditorStore((s) => s.hydrate);

  useEffect(() => {
    hydrateTheme();
  }, [hydrateTheme]);

  useEffect(() => {
    hydrateCompletion();
  }, [hydrateCompletion]);

  useEffect(() => {
    hydrateEditor();
  }, [hydrateEditor]);

  // Track completed set via ref so questionStore.hydrate() gets the latest
  // value without adding `completed` as a dependency (which would re-trigger hydration)
  const completedRef = useRef(useCompletionStore.getState().completed);
  useEffect(() => {
    return useCompletionStore.subscribe((s) => {
      completedRef.current = s.completed;
    });
  }, []);

  useEffect(() => {
    if (completionLoading) return;
    hydrateQuestion(completedRef.current);
  }, [completionLoading, hydrateQuestion]);

  if (!themeLoaded || completionLoading || questionLoading || !editorLoaded) {
    return loadingSpinner;
  }

  return <AppInner />;
}

function AppInner() {
  const completed = useCompletionStore((s) => s.completed);
  const toggleComplete = useCompletionStore((s) => s.toggleComplete);
  const resetProgress = useCompletionStore((s) => s.resetProgress);

  const question = useQuestionStore((s) => s.question);
  const totalQuestions = useQuestionStore((s) => s.totalQuestions);
  const nextQuestionAction = useQuestionStore((s) => s.nextQuestion);
  const selectQuestion = useQuestionStore((s) => s.selectQuestion);

  const running = useCodeRunnerStore((s) => s.running);
  const result = useCodeRunnerStore((s) => s.result);
  const pyodideLoading = useCodeRunnerStore((s) => s.pyodideLoading);
  const runCode = useCodeRunnerStore((s) => s.run);
  const clearResult = useCodeRunnerStore((s) => s.clearResult);

  const themeMode = useThemeStore((s) => s.theme.mode);
  const themePalette = useThemeStore((s) => s.theme.palette);

  const editorSettings = useEditorStore((s) => s.settings);

  const [language, setLanguage] = useState<Language>("javascript");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  // Stores editor content in a ref to avoid re-renders on every keystroke
  const codeRef = useRef("");

  const scaffoldCode = question?.scaffolds[language] ?? "";

  useEffect(() => {
    codeRef.current = scaffoldCode;
  }, [scaffoldCode]);

  // Forces CodeEditor to fully remount when question, language, theme, or editor settings change.
  // CM6 doesn't support dynamic reconfiguration of themes, so a fresh instance is needed.
  const editorKey = question
    ? `${question.id}-${language}-${themeMode}-${themePalette}-${JSON.stringify(editorSettings)}`
    : "empty";

  const handleCodeChange = useCallback((code: string) => {
    codeRef.current = code;
  }, []);

  const handleRun = useCallback(() => {
    if (!codeRef.current) return;
    runCode(language, codeRef.current);
  }, [language, runCode]);

  const handleSubmit = useCallback(async () => {
    if (!codeRef.current || !question) return;
    await saveSolution(question.id, language, codeRef.current);
    runCode(language, codeRef.current);
  }, [language, runCode, question]);

  const handleNext = useCallback(() => {
    clearResult();
    codeRef.current = "";
    nextQuestionAction(completed);
  }, [nextQuestionAction, clearResult, completed]);

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

  const openSettings = useCallback(() => setShowSettings(true), []);
  const closeSettings = useCallback(() => setShowSettings(false), []);
  const openQuestions = useCallback(() => setShowQuestions(true), []);
  const closeQuestions = useCallback(() => setShowQuestions(false), []);
  const openResetConfirm = useCallback(() => setShowResetConfirm(true), []);
  const closeResetConfirm = useCallback(() => setShowResetConfirm(false), []);

  const handleSelectQuestion = useCallback(
    (id: number) => {
      selectQuestion(id);
      clearResult();
      codeRef.current = "";
    },
    [selectQuestion, clearResult],
  );

  if (!question) {
    return (
      <div className="app-done">
        <div className="app-done__content">
          <h1>All Done!</h1>
          <p>
            You've completed all {totalQuestions} questions. Amazing work!
          </p>
          <button className="btn btn--primary" onClick={openResetConfirm}>
            Reset Progress
          </button>
          {showResetConfirm ? (
            <div className="confirm-overlay">
              <div className="confirm-dialog">
                <p>Reset all progress? This cannot be undone.</p>
                <div className="confirm-dialog__actions">
                  <button className="btn btn--danger" onClick={handleReset}>
                    Yes, Reset
                  </button>
                  <button className="btn btn--secondary" onClick={closeResetConfirm}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <h1>Sighted <span className="brand-accent">75</span></h1>
        </div>
        <div className="topbar__center">
          <ProgressBar completed={completed.size} total={totalQuestions} />
        </div>
        <div className="topbar__actions">
          <button
            className="topbar__settings-btn"
            onClick={openQuestions}
            aria-label="All Questions"
            title="All Questions"
          >
            {listIcon}
          </button>
          <button
            className="topbar__settings-btn"
            onClick={openSettings}
            aria-label="Settings"
            title="Settings"
          >
            {gearIcon}
          </button>
          <button className="btn btn--secondary" onClick={handleNext}>
            Next Question
          </button>
          <button className="btn btn--ghost" onClick={openResetConfirm}>
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
                  {running ? "Running\u2026" : "Run"}
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
              themeMode={themeMode}
              editorSettings={editorSettings}
              onCodeChange={handleCodeChange}
              onRun={handleRun}
            />
          </div>
          <OutputPanel result={result} running={running} pyodideLoading={pyodideLoading} />
        </div>
      </main>

      {showResetConfirm ? (
        <div className="confirm-overlay" onClick={closeResetConfirm}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p>Reset all progress? This cannot be undone.</p>
            <div className="confirm-dialog__actions">
              <button className="btn btn--danger" onClick={handleReset}>
                Yes, Reset
              </button>
              <button className="btn btn--secondary" onClick={closeResetConfirm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <SettingsModal open={showSettings} onClose={closeSettings} />
      <QuestionsModal
        open={showQuestions}
        onClose={closeQuestions}
        completed={completed}
        currentQuestionId={question?.id ?? null}
        onSelectQuestion={handleSelectQuestion}
      />
    </div>
  );
}

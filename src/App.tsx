"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Eye, EyeOff, Shuffle, MessageCircle, Users } from "lucide-react";
import type { Language } from "./types/question";
import { useThemeStore } from "./store/themeStore";
import { useCompletionStore } from "./store/completionStore";
import { useQuestionStore } from "./store/questionStore";
import { useCodeRunnerStore } from "./store/codeRunnerStore";
import { useEditorStore } from "./store/editorStore";
import { useAuthStore } from "./store/authStore";
import { saveSolution } from "./store/db";
import { applyAppThemeOverride } from "./themes/editorThemeColors";
import { ProgressBar } from "./components/ProgressBar";
import { QuestionCard } from "./components/QuestionCard";
import { LanguageSelector } from "./components/LanguageSelector";
import { CodeEditor } from "./components/CodeEditor";
import { OutputPanel } from "./components/OutputPanel";
import { SettingsModal } from "./components/SettingsModal";
import { QuestionsModal } from "./components/QuestionsModal";
import { WelcomeGate, getAuthChoice, setAuthChoice } from "./components/WelcomeGate";
import { Timer } from "./components/Timer";
import { ChatModal } from "./components/ChatModal";
import { GroupsModal } from "./components/GroupsModal";
import { GroupSessionBanner } from "./components/GroupSession";
import { useChatStore } from "./store/chatStore";
import { useGroupStore } from "./store/groupStore";
import questionsData from "./data/questions.json";
import type { Question } from "./types/question";

const allQuestions = questionsData as Question[];

const listIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const gearIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const loadingSpinner = (
  <div className="h-full flex items-center justify-center flex-col gap-6 bg-[var(--bg-deep)]">
    <div className="w-7 h-7 border-[3px] border-[var(--bg-surface)] border-t-[var(--accent)] rounded-full animate-spin" />
  </div>
);

export function App() {
  const authLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrateAuth = useAuthStore((s) => s.hydrate);

  const themeLoaded = useThemeStore((s) => s.loaded);
  const hydrateTheme = useThemeStore((s) => s.hydrate);

  const completionLoading = useCompletionStore((s) => s.loading);
  const hydrateCompletion = useCompletionStore((s) => s.hydrate);

  const questionLoading = useQuestionStore((s) => s.loading);
  const hydrateQuestion = useQuestionStore((s) => s.hydrate);

  const editorLoaded = useEditorStore((s) => s.loaded);
  const hydrateEditor = useEditorStore((s) => s.hydrate);

  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeChecked, setWelcomeChecked] = useState(false);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  // After auth resolves, decide whether to show the welcome gate
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      setAuthChoice("authenticated");
      setWelcomeChecked(true);
    } else {
      const choice = getAuthChoice();
      setShowWelcome(!choice);
      setWelcomeChecked(true);
    }
  }, [authLoading, isAuthenticated]);

  // Hydrate stores only after auth is resolved and welcome gate is dismissed
  useEffect(() => {
    if (!welcomeChecked || showWelcome) return;
    hydrateTheme();
    hydrateCompletion();
    hydrateEditor();
  }, [welcomeChecked, showWelcome, hydrateTheme, hydrateCompletion, hydrateEditor]);

  const editorTheme = useEditorStore((s) => s.settings.editorTheme);
  const adaptAppTheme = useEditorStore((s) => s.settings.adaptAppTheme);

  useEffect(() => {
    if (!editorLoaded) return;
    applyAppThemeOverride(editorTheme, adaptAppTheme);
    return () => applyAppThemeOverride("auto", false);
  }, [editorLoaded, editorTheme, adaptAppTheme]);

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

  if (showWelcome) {
    return (
      <WelcomeGate
        onContinueLocally={() => setShowWelcome(false)}
        onAuthenticated={() => window.location.reload()}
      />
    );
  }

  if (!themeLoaded || completionLoading || questionLoading || !editorLoaded) {
    return loadingSpinner;
  }

  return <AppInner />;
}

function AllDoneScreen({ totalQuestions }: { totalQuestions: number }) {
  const resetProgress = useCompletionStore((s) => s.resetProgress);
  const [confirming, setConfirming] = useState(false);

  const handleReset = useCallback(async () => {
    await resetProgress();
    window.location.reload();
  }, [resetProgress]);

  return (
    <div className="h-full flex items-center justify-center flex-col gap-6 bg-[var(--bg-deep)]">
      <div className="text-center flex flex-col items-center gap-5 animate-fade-in-up">
        <h1 className="font-[family-name:var(--font-display)] text-[2.8rem] font-bold text-[var(--accent)] tracking-[-0.03em] text-balance">
          All Done!
        </h1>
        <p className="text-[var(--text-secondary)] text-[15px] max-w-[360px] leading-[1.7]">
          You've completed all {totalQuestions} questions. Amazing work!
        </p>
        <button
          className="px-4 py-2 rounded-[var(--radius-md)] text-[13px] font-semibold bg-[var(--accent)] text-[var(--accent-text-on)] transition-[background-color,box-shadow] duration-200 ease-out hover:bg-[var(--accent-hover)] hover:shadow-[0_0_20px_var(--accent-glow)]"
          onClick={() => setConfirming(true)}
        >
          Reset Progress
        </button>
        {confirming ? (
          <div
            className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-[8px] flex items-center justify-center z-[100] animate-fade-in-fast overscroll-contain"
            onClick={() => setConfirming(false)}
          >
            <div
              className="bg-[var(--bg-primary)] border border-[var(--border-bright)] rounded-[var(--radius-lg)] px-6 pt-7 pb-[22px] max-w-[380px] text-center shadow-[var(--shadow-dialog)] animate-fade-in-up-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-[22px] text-[14px] leading-[1.6] text-[var(--text-secondary)]">
                Reset all progress? This cannot be undone.
              </p>
              <div className="flex gap-2.5 justify-center">
                <button
                  className="px-4 py-2 rounded-[var(--radius-md)] text-[13px] font-semibold bg-[var(--red)] text-white hover:bg-[#DC2626] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-[background-color,box-shadow] duration-200 ease-out"
                  onClick={handleReset}
                >
                  Yes, Reset
                </button>
                <button
                  className="px-4 py-2 rounded-[var(--radius-md)] text-[13px] font-semibold bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-bright)] hover:text-[var(--text)] hover:bg-[var(--bg-elevated)] transition-[background-color,color] duration-200 ease-out"
                  onClick={() => setConfirming(false)}
                >
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

function AppInner() {
  const completed = useCompletionStore((s) => s.completed);
  const toggleComplete = useCompletionStore((s) => s.toggleComplete);
  const recordAttempt = useCompletionStore((s) => s.recordAttempt);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authUser = useAuthStore((s) => s.user);

  const question = useQuestionStore((s) => s.question);
  const totalQuestions = useQuestionStore((s) => s.totalQuestions);
  const randomQuestionAction = useQuestionStore((s) => s.randomQuestion);
  const selectQuestion = useQuestionStore((s) => s.selectQuestion);

  const running = useCodeRunnerStore((s) => s.running);
  const result = useCodeRunnerStore((s) => s.result);
  const pyodideLoading = useCodeRunnerStore((s) => s.pyodideLoading);
  const runCode = useCodeRunnerStore((s) => s.run);
  const clearResult = useCodeRunnerStore((s) => s.clearResult);

  const themeMode = useThemeStore((s) => s.theme.mode);
  const themePalette = useThemeStore((s) => s.theme.palette);

  const editorSettings = useEditorStore((s) => s.settings);

  const setChatOpen = useChatStore((s) => s.setOpen);
  const openChat = useCallback(() => setChatOpen(true), [setChatOpen]);

  const setGroupsOpen = useGroupStore((s) => s.setOpen);
  const groupInvitationCount = useGroupStore((s) => s.invitations.length);
  const openGroups = useCallback(() => setGroupsOpen(true), [setGroupsOpen]);

  const liveSession = useGroupStore((s) => s.liveSession);
  const submitResult = useGroupStore((s) => s.submitResult);

  const sessionQuestion = liveSession
    ? allQuestions.find((q) => q.id === liveSession.session.questionId) ?? null
    : null;

  const displayQuestion = liveSession ? sessionQuestion : question;

  const [language, setLanguage] = useState<Language>("javascript");
  const [showSettings, setShowSettings] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const codeRef = useRef("");

  const [sessionSubmitted, setSessionSubmitted] = useState(false);
  const [sessionSubmitting, setSessionSubmitting] = useState(false);

  useEffect(() => {
    setSessionSubmitted(false);
    setSessionSubmitting(false);
  }, [liveSession?.session.id]);

  const handleSessionSubmit = useCallback(async () => {
    if (!liveSession || sessionSubmitted) return;
    const timeSpent = Math.floor((Date.now() - liveSession.joinedAt) / 1000);
    setSessionSubmitting(true);
    try {
      await submitResult(liveSession.session.id, true, timeSpent, codeRef.current);
      setSessionSubmitted(true);
    } catch { /* error in store */ }
    setSessionSubmitting(false);
  }, [liveSession, sessionSubmitted, submitResult]);

  const scaffoldCode = displayQuestion?.scaffolds[language] ?? "";

  useEffect(() => {
    codeRef.current = scaffoldCode;
  }, [scaffoldCode]);

  const { showHints: _, showKeywords: _k, zenFullscreen: _z, ...editorCmSettings } = editorSettings;
  const editorKey = displayQuestion
    ? `${displayQuestion.id}-${language}-${themeMode}-${themePalette}-${liveSession ? "gs" : "n"}-${JSON.stringify(editorCmSettings)}`
    : "empty";

  const handleCodeChange = useCallback((code: string) => {
    codeRef.current = code;
  }, []);

  const handleRun = useCallback(() => {
    if (!codeRef.current || !displayQuestion) return;
    if (!liveSession) recordAttempt(displayQuestion.id);
    runCode(language, codeRef.current);
  }, [language, runCode, displayQuestion, recordAttempt, liveSession]);

  const handleSubmit = useCallback(async () => {
    if (!codeRef.current || !displayQuestion) return;
    if (liveSession) {
      handleSessionSubmit();
      return;
    }
    recordAttempt(displayQuestion.id);
    await saveSolution(displayQuestion.id, language, codeRef.current);
    runCode(language, codeRef.current);
  }, [language, runCode, displayQuestion, recordAttempt, liveSession, handleSessionSubmit]);

  const handleRandom = useCallback(() => {
    clearResult();
    codeRef.current = "";
    randomQuestionAction();
  }, [randomQuestionAction, clearResult]);

  const handleLanguageChange = useCallback(
    (lang: Language) => {
      setLanguage(lang);
      clearResult();
    },
    [clearResult],
  );

  const openSettings = useCallback(() => setShowSettings(true), []);
  const closeSettings = useCallback(() => setShowSettings(false), []);
  const openQuestions = useCallback(() => setShowQuestions(true), []);
  const closeQuestions = useCallback(() => setShowQuestions(false), []);
  const zenFullscreen = useEditorStore((s) => s.settings.zenFullscreen);
  const zenTimer = useEditorStore((s) => s.settings.zenTimer);

  const toggleZen = useCallback(() => {
    setZenMode((prev) => {
      const next = !prev;
      if (next && zenFullscreen) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
      if (!next && document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      return next;
    });
  }, [zenFullscreen]);

  const exitZen = useCallback(() => {
    setZenMode(false);
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!zenMode) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) {
        setZenMode(false);
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && zenFullscreen) {
        setZenMode(false);
      }
    };

    document.addEventListener("keydown", handleKey);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [zenMode, zenFullscreen]);

  const handleSelectQuestion = useCallback(
    (id: number) => {
      selectQuestion(id);
      clearResult();
      codeRef.current = "";
    },
    [selectQuestion, clearResult],
  );

  if (!displayQuestion) {
    return <AllDoneScreen totalQuestions={totalQuestions} />;
  }

  if (zenMode) {
    return (
      <div className="group fixed inset-0 z-[9999] flex flex-col bg-[var(--cm-bg,var(--bg-deep))] animate-zen-fade-in">
        <div className="flex-1 min-h-0 flex flex-col">
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
        <div className="fixed top-3 right-3 z-[10000] flex flex-col items-end gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--bg-surface)] text-[var(--text-muted)] font-[family-name:var(--font-display)] text-[11px] font-semibold tracking-[0.03em] opacity-0 transition-[opacity,background-color,color] duration-200 ease-out pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto hover:bg-[var(--bg-elevated)] hover:text-[var(--text)] focus-visible:opacity-100 focus-visible:pointer-events-auto"
            onClick={exitZen}
            aria-label="Exit Zen Mode"
            title="Exit Zen Mode (Esc)"
          >
            <EyeOff size={16} />
            <span className="px-[5px] py-px rounded-[3px] bg-[var(--bg-elevated)] text-[10px] leading-none">Esc</span>
          </button>
          {zenTimer ? (
            <div className="px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--bg-surface)]">
              <Timer questionId={displayQuestion?.id ?? null} zen />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-deep)] transition-colors duration-300">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 h-[52px] bg-[var(--bg-primary)] border-b-2 border-b-[var(--accent)] shrink-0 transition-[background-color,border-color] duration-300">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-[var(--text)] tracking-[-0.01em]">
            Sighted <span className="text-[var(--accent)]">75</span>
          </h1>
        </div>
        <div className="flex-1 max-w-[320px] mx-6">
          <ProgressBar completed={completed.size} total={totalQuestions} />
        </div>
        <div className="flex items-center gap-1.5">
          {!liveSession ? (
            <button
              className="flex items-center justify-center w-[34px] h-[34px] rounded-[var(--radius-md)] text-[var(--text-muted)] transition-[color,background-color] duration-200 ease-out cursor-pointer hover:text-[var(--text)] hover:bg-[var(--bg-surface)] [&:hover_svg]:rotate-45 [&_svg]:transition-transform [&_svg]:duration-300 [&_svg]:ease-out"
              onClick={openQuestions}
              aria-label="All Questions"
              title="All Questions"
            >
              {listIcon}
            </button>
          ) : null}
          {!liveSession ? (
            <button
              className="flex items-center justify-center w-[34px] h-[34px] rounded-[var(--radius-md)] text-[var(--text-muted)] transition-[color,background-color] duration-200 ease-out cursor-pointer hover:text-[var(--text)] hover:bg-[var(--bg-surface)] [&:hover_svg]:rotate-45 [&_svg]:transition-transform [&_svg]:duration-300 [&_svg]:ease-out"
              onClick={toggleZen}
              aria-label="Zen Mode"
              title="Zen Mode"
            >
              <Eye size={18} />
            </button>
          ) : null}
          {isAuthenticated ? (
            <button
              className="relative flex items-center justify-center w-[34px] h-[34px] rounded-[var(--radius-md)] text-[var(--text-muted)] transition-[color,background-color] duration-200 ease-out cursor-pointer hover:text-[var(--text)] hover:bg-[var(--bg-surface)]"
              onClick={openGroups}
              aria-label="Groups"
              title="Groups"
            >
              <Users size={18} />
              {groupInvitationCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-[var(--accent)] text-[var(--accent-text-on)] text-[9px] font-bold px-1 leading-none">
                  {groupInvitationCount}
                </span>
              ) : null}
            </button>
          ) : null}
          {isAuthenticated ? (
            <button
              className="flex items-center justify-center w-[34px] h-[34px] rounded-[var(--radius-md)] text-[var(--text-muted)] transition-[color,background-color] duration-200 ease-out cursor-pointer hover:text-[var(--text)] hover:bg-[var(--bg-surface)]"
              onClick={openChat}
              aria-label="Chat"
              title="Encrypted Chat"
            >
              <MessageCircle size={18} />
            </button>
          ) : null}
          <button
            className="flex items-center justify-center w-[34px] h-[34px] rounded-[var(--radius-md)] text-[var(--text-muted)] transition-[color,background-color] duration-200 ease-out cursor-pointer hover:text-[var(--text)] hover:bg-[var(--bg-surface)] [&:hover_svg]:rotate-45 [&_svg]:transition-transform [&_svg]:duration-300 [&_svg]:ease-out"
            onClick={openSettings}
            aria-label="Settings"
            title="Settings"
          >
            {gearIcon}
          </button>
          {!liveSession ? (
            <button
              className="flex items-center justify-center w-[34px] h-[34px] rounded-[var(--radius-md)] text-[var(--text-muted)] transition-[color,background-color] duration-200 ease-out cursor-pointer hover:text-[var(--text)] hover:bg-[var(--bg-surface)]"
              onClick={handleRandom}
              aria-label="Random Question"
              title="Random Question"
            >
              <Shuffle size={18} />
            </button>
          ) : null}
        </div>
      </header>

      {/* Group session banner */}
      {liveSession ? (
        <GroupSessionBanner
          liveSession={liveSession}
          submitted={sessionSubmitted}
          onSubmit={handleSessionSubmit}
          submitting={sessionSubmitting}
        />
      ) : null}

      {/* Split layout */}
      <main className="flex flex-1 min-h-0">
        <div className="w-[44%] min-w-[360px] overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-primary)] animate-fade-in transition-colors duration-300">
          <QuestionCard
            question={displayQuestion}
            isCompleted={completed.has(displayQuestion.id)}
            onToggleComplete={liveSession ? undefined : () => toggleComplete(displayQuestion.id)}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-deep)] animate-[fadeIn_0.3s_ease-out_0.05s_both] transition-colors duration-300">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-3.5 py-2 bg-[var(--bg-primary)] border-b border-[var(--border)] transition-colors duration-300">
              <LanguageSelector language={language} onChange={handleLanguageChange} />
              {!liveSession ? <Timer questionId={displayQuestion?.id ?? null} /> : <div />}
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded-[var(--radius-md)] text-[13px] font-semibold bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-bright)] transition-[background-color,color] duration-200 ease-out hover:text-[var(--text)] hover:bg-[var(--bg-elevated)]"
                  onClick={handleRun}
                  disabled={running}
                >
                  {running ? "Running\u2026" : "Run"}
                </button>
                <button
                  className={`px-4 py-2 rounded-[var(--radius-md)] text-[13px] font-semibold transition-[background-color,box-shadow] duration-200 ease-out ${
                    liveSession && sessionSubmitted
                      ? "bg-green-500/15 text-green-400 cursor-default"
                      : "bg-[var(--accent)] text-[var(--accent-text-on)] hover:bg-[var(--accent-hover)] hover:shadow-[0_0_20px_var(--accent-glow)]"
                  }`}
                  onClick={handleSubmit}
                  disabled={running || (liveSession ? sessionSubmitted || sessionSubmitting : false)}
                >
                  {liveSession
                    ? sessionSubmitting
                      ? "Submitting\u2026"
                      : sessionSubmitted
                        ? "Submitted"
                        : "Submit"
                    : "Submit"}
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

      {/* Footer */}
      <footer className="flex items-center justify-between px-5 h-[28px] bg-[var(--bg-primary)] border-t border-[var(--border)] shrink-0 transition-[background-color,border-color] duration-300">
        <span className="text-[11px] text-[var(--text-muted)] tabular-nums">v1.0.0</span>
        <span className="text-[11px] text-[var(--text-muted)] truncate">
          {isAuthenticated && authUser
            ? <>Signed in as <span className="text-[var(--text-secondary)] font-medium">@{authUser.username}</span></>
            : "Guest"}
        </span>
      </footer>

      <SettingsModal open={showSettings} onClose={closeSettings} />
      <QuestionsModal
        open={showQuestions}
        onClose={closeQuestions}
        completed={completed}
        currentQuestionId={question?.id ?? null}
        onSelectQuestion={handleSelectQuestion}
      />
      {isAuthenticated ? <ChatModal /> : null}
      {isAuthenticated ? <GroupsModal /> : null}
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { AuthForms } from "./AuthForms";

const AUTH_CHOICE_KEY = "sighted75:auth-choice";

export type AuthChoice = "local" | "authenticated" | null;

export function getAuthChoice(): AuthChoice {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_CHOICE_KEY) as AuthChoice;
}

export function setAuthChoice(choice: "local" | "authenticated") {
  localStorage.setItem(AUTH_CHOICE_KEY, choice);
}

interface WelcomeGateProps {
  onContinueLocally: () => void;
  onAuthenticated: () => void;
}

export function WelcomeGate({ onContinueLocally, onAuthenticated }: WelcomeGateProps) {
  const [exiting, setExiting] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");

  const handleContinueLocally = useCallback(() => {
    setAuthChoice("local");
    setExiting(true);
    setTimeout(onContinueLocally, 200);
  }, [onContinueLocally]);

  const handleAuthSuccess = useCallback(() => {
    setAuthChoice("authenticated");
    setExiting(true);
    setTimeout(() => {
      onAuthenticated();
    }, 200);
  }, [onAuthenticated]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg-deep)] transition-opacity duration-200 ${exiting ? "opacity-0" : "opacity-100"}`}
    >
      <div className="flex flex-col items-center gap-8 max-w-[420px] px-6 text-center animate-fade-in-up">
        <div className="flex flex-col items-center gap-3">
          <h1 className="font-[family-name:var(--font-display)] text-[2rem] font-bold text-[var(--text)] tracking-[-0.03em] text-balance">
            Welcome to Sighted{" "}
            <span className="text-[var(--accent)]">75</span>
          </h1>
          {!showAuth && (
            <p className="text-[var(--text-secondary)] text-[15px] leading-[1.7] max-w-[360px]">
              Practice the Blind 75 coding questions with an in-browser editor,
              track your progress, and level up.
            </p>
          )}
        </div>

        {showAuth ? (
          <div className="w-full flex flex-col gap-4">
            <AuthForms onSuccess={handleAuthSuccess} initialMode={authMode} />
            <button
              className="text-[13px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-150"
              onClick={() => setShowAuth(false)}
            >
              Back
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="flex gap-3 w-full">
              <button
                className="flex-1 inline-flex items-center justify-center px-5 py-2.5 rounded-[var(--radius-md)] text-[14px] font-semibold bg-[var(--accent)] text-[var(--accent-text-on)] transition-[background-color,box-shadow] duration-200 ease-out hover:bg-[var(--accent-hover)] hover:shadow-[0_0_20px_var(--accent-glow)]"
                onClick={() => {
                  setAuthMode("sign-in");
                  setShowAuth(true);
                }}
              >
                Sign In
              </button>
              <button
                className="flex-1 inline-flex items-center justify-center px-5 py-2.5 rounded-[var(--radius-md)] text-[14px] font-semibold bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-bright)] transition-[background-color,color] duration-200 ease-out hover:text-[var(--text)] hover:bg-[var(--bg-elevated)]"
                onClick={() => {
                  setAuthMode("sign-up");
                  setShowAuth(true);
                }}
              >
                Sign Up
              </button>
            </div>

            <div className="flex items-center gap-3 w-full my-1">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-[var(--text-muted)] text-[12px] font-medium uppercase tracking-[0.08em]">
                or
              </span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            <button
              className="w-full px-5 py-2.5 rounded-[var(--radius-md)] text-[14px] font-medium text-[var(--text-muted)] transition-[background-color,color] duration-200 ease-out hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
              onClick={handleContinueLocally}
            >
              Continue Locally
            </button>

            <p className="text-[var(--text-muted)] text-[11px] leading-[1.6] max-w-[320px] mt-1">
              Your progress will be saved in this browser only and may be lost if
              you clear your data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

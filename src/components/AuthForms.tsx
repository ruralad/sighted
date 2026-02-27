"use client";

import { useState, useCallback, type FormEvent } from "react";
import { signUp, signIn } from "../../app/actions/auth";

interface AuthFormsProps {
  onSuccess: () => void;
  initialMode?: "sign-in" | "sign-up";
}

export function AuthForms({ onSuccess, initialMode = "sign-in" }: AuthFormsProps) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        if (mode === "sign-up") {
          const result = await signUp(username, password, displayName);
          if (result.error) {
            setError(result.error);
            setLoading(false);
            return;
          }
        } else {
          const result = await signIn(username, password);
          if (result.error) {
            setError(result.error);
            setLoading(false);
            return;
          }
        }
        onSuccess();
      } catch {
        setError("Something went wrong. Please try again.");
        setLoading(false);
      }
    },
    [mode, username, password, displayName, onSuccess],
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="auth-username"
          className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]"
        >
          Username
        </label>
        <input
          id="auth-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          maxLength={30}
          autoComplete="username"
          autoFocus
          className="px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-bright)] bg-[var(--bg-primary)] text-[var(--text)] text-[14px] font-[family-name:var(--font-body)] outline-none transition-[border-color,box-shadow] duration-150 ease-out focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-dim)]"
          placeholder="your_username"
        />
      </div>

      {mode === "sign-up" && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="auth-display-name"
            className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]"
          >
            Display Name
          </label>
          <input
            id="auth-display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            className="px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-bright)] bg-[var(--bg-primary)] text-[var(--text)] text-[14px] font-[family-name:var(--font-body)] outline-none transition-[border-color,box-shadow] duration-150 ease-out focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-dim)]"
            placeholder="How you want to be called"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="auth-password"
          className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]"
        >
          Password
        </label>
        <input
          id="auth-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          className="px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-bright)] bg-[var(--bg-primary)] text-[var(--text)] text-[14px] font-[family-name:var(--font-body)] outline-none transition-[border-color,box-shadow] duration-150 ease-out focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-dim)]"
          placeholder={mode === "sign-up" ? "Min 8 characters" : "Your password"}
        />
      </div>

      {error && (
        <p className="text-[13px] text-[var(--red)] leading-[1.5]">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2.5 rounded-[var(--radius-md)] text-[14px] font-semibold bg-[var(--accent)] text-[var(--accent-text-on)] transition-[background-color,box-shadow] duration-200 ease-out hover:bg-[var(--accent-hover)] hover:shadow-[0_0_20px_var(--accent-glow)] disabled:opacity-50 disabled:pointer-events-none"
      >
        {loading
          ? mode === "sign-up"
            ? "Creating account\u2026"
            : "Signing in\u2026"
          : mode === "sign-up"
            ? "Create Account"
            : "Sign In"}
      </button>

      <p className="text-center text-[13px] text-[var(--text-muted)]">
        {mode === "sign-in" ? (
          <>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              className="text-[var(--accent)] font-medium hover:underline"
              onClick={() => {
                setMode("sign-up");
                setError(null);
              }}
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              className="text-[var(--accent)] font-medium hover:underline"
              onClick={() => {
                setMode("sign-in");
                setError(null);
              }}
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </form>
  );
}

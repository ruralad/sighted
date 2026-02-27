"use client";

import type { Language } from "../types/question";

interface LanguageSelectorProps {
  language: Language;
  onChange: (lang: Language) => void;
}

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
];

export function LanguageSelector({ language, onChange }: LanguageSelectorProps) {
  return (
    <div className="flex gap-0.5 bg-[var(--bg-deep)] rounded-[var(--radius-md)] p-[3px] border border-[var(--border)] transition-colors duration-300">
      {LANGUAGES.map((l) => (
        <button
          key={l.value}
          className={`px-3.5 py-1.5 rounded-[6px] font-[family-name:var(--font-display)] text-[12px] font-medium transition-[color,background-color] duration-150 ease-out cursor-pointer ${
            language === l.value
              ? "bg-[var(--accent)] text-[var(--accent-text-on)] font-bold"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
          }`}
          onClick={() => onChange(l.value)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

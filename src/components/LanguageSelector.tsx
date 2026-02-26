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
    <div className="lang-selector">
      {LANGUAGES.map((l) => (
        <button
          key={l.value}
          className={`lang-selector__tab ${language === l.value ? "lang-selector__tab--active" : ""}`}
          onClick={() => onChange(l.value)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

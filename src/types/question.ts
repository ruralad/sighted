export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface Scaffolds {
  python: string;
  javascript: string;
  go: string;
  java: string;
  rust: string;
  c: string;
  cpp: string;
}

export type Language = "python" | "javascript" | "go" | "java" | "rust" | "c" | "cpp";

export interface Question {
  id: number;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  description: string;
  examples: Example[];
  keywords: string[];
  hints: [string, string, string];
  scaffolds: Scaffolds;
}

export interface StoredSolution {
  language: Language;
  code: string;
  timestamp: number;
}

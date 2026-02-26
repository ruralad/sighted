# Sighted 75 — Agent Guidelines

## Project Overview

Sighted 75 is a single-page React app for practicing LeetCode-style coding questions (the "Blind 75" set). It features an in-browser code editor (CodeMirror 6), JavaScript/Python execution, Go/Java scaffold-only support, completion tracking via IndexedDB, and a multi-palette dark/light theme system.

## Tech Stack

- **Runtime:** Node 22+ (use `nvm use 22`)
- **Package manager:** Bun
- **Bundler:** rolldown-vite (aliased as `vite`)
- **Framework:** React 19 + TypeScript
- **State management:** Zustand 5
- **Editor:** CodeMirror 6
- **Persistence:** IndexedDB via `idb-keyval`
- **Linter:** oxlint
- **Fonts:** JetBrains Mono (display/code) + IBM Plex Sans (body) via Google Fonts

## Commands

```bash
bun install        # install dependencies
bun run dev        # start dev server (localhost:5173)
bun run build      # production build
bun run lint       # lint with oxlint
```

## Architecture

```
src/
├── main.tsx                  # Entry point, renders <App /> in StrictMode
├── App.tsx                   # Root component, hydrates stores, orchestrates layout
├── components/               # Presentational components
│   ├── CodeEditor.tsx        # CodeMirror 6 wrapper with dynamic theming
│   ├── HintPanel.tsx         # Progressive hint reveal
│   ├── LanguageSelector.tsx  # JS/Python/Go/Java tab selector
│   ├── OutputPanel.tsx       # Code execution output display
│   ├── ProgressBar.tsx       # Completion progress indicator
│   ├── QuestionCard.tsx      # Question display with examples
│   └── SettingsModal.tsx     # Theme/palette settings modal
├── store/                    # Zustand stores + IndexedDB layer
│   ├── themeStore.ts         # Theme mode (dark/light) + palette (emerald/ocean/amber)
│   ├── completionStore.ts    # Question completion tracking
│   ├── questionStore.ts      # Current question selection
│   ├── codeRunnerStore.ts    # Code execution state
│   └── db.ts                 # IndexedDB persistence functions
├── runners/                  # Language-specific code execution
│   ├── javaRunner.ts         # Stub — Java not supported in browser (like Go)
│   ├── jsRunner.ts           # In-browser JS execution via Function()
│   ├── pythonRunner.ts       # In-browser Python via Pyodide (lazy-loaded)
│   └── goRunner.ts           # Stub — Go not supported in browser
├── data/
│   └── questions.json        # Question bank (5 questions)
├── types/
│   └── question.ts           # TypeScript interfaces
└── styles/
    └── global.css            # Full design system with 6 theme variants
```

## Conventions

### State Management

All application state lives in Zustand stores under `src/store/`. Do **not** use React Context or custom hooks for shared state. Each store exposes a `hydrate()` method for async initialization from IndexedDB.

Selector pattern — always use granular selectors to avoid unnecessary re-renders:

```tsx
const mode = useThemeStore((s) => s.theme.mode);  // good
const store = useThemeStore();                      // bad — subscribes to everything
```

### Components

- Components are functional, never class-based.
- Components receive data via props or Zustand selectors — no prop drilling of store actions through multiple layers.
- Use `useCallback` for event handlers passed as props. Use functional `setState` updates to avoid stale closures.
- Use ternary (`? :`) instead of `&&` for conditional rendering when the condition could be falsy (0, NaN).
- Hoist static JSX (SVG icons, skeletons) outside components as module-level constants.

### Theming

The theme system uses CSS custom properties with `[data-mode][data-palette]` attribute selectors on `<html>`. There are 3 palettes (emerald, ocean, amber) x 2 modes (dark, light) = 6 variants. Theme tokens are defined in `src/styles/global.css`. The `themeStore` applies attributes to the DOM and persists to IndexedDB.

CodeMirror theming reads CSS variables at editor creation time via `readCSSVar()` in `CodeEditor.tsx`.

### CSS

- All styles live in `src/styles/global.css` — no CSS modules, no CSS-in-JS.
- BEM-like naming: `.block__element--modifier`.
- Never use `transition: all` — list properties explicitly.
- Honor `prefers-reduced-motion`.
- Use `overscroll-behavior: contain` on modals/overlays.
- Use `font-variant-numeric: tabular-nums` for numeric displays.
- Use `text-wrap: balance` on headings.

### Accessibility

- Icon-only buttons must have `aria-label`.
- Decorative SVGs must have `aria-hidden="true"`.
- All interactive elements must have visible `focus-visible` states.
- Modals must close on Escape and overlay click.

### IndexedDB Keys

All keys are prefixed with `sighted75:` (e.g., `sighted75:completed`, `sighted75:theme`).

### Typography

- Use `\u2026` (ellipsis character) instead of `...` in UI text.
- Loading states should end with ellipsis: `"Running\u2026"`, `"Loading\u2026"`.

## Skills

**Always consult the skills in `.agents/skills/` before making changes.** These contain binding guidelines for this project:

- **`.agents/skills/vercel-react-best-practices/`** — React performance optimization rules (57 rules across 8 categories). Read `AGENTS.md` in that directory for the full guide. Apply these when writing or refactoring any React code.
- **`.agents/skills/web-design-guidelines/`** — Vercel Web Interface Guidelines for accessibility, animation, forms, typography, and more. Fetch the latest rules from the source URL in `SKILL.md` and audit UI code against them.
- **`.agents/skills/ui-ux-pro-max/`** — Design system generation tool. Use when redesigning UI or creating new visual components. Enforces no-emoji icons (use SVGs), specific font/palette choices, and layout patterns.

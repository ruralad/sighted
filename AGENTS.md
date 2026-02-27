# Sighted 75 — Agent Guidelines

## Project Overview

Sighted 75 is a single-page React app for practicing LeetCode-style coding questions (the "Blind 75" set). It features an in-browser code editor (CodeMirror 6) with 31 selectable syntax themes, JavaScript/Python execution, Go/Java/Rust/C/C++ scaffold-only support, completion tracking via IndexedDB, a multi-palette dark/light theme system with optional editor-theme-driven app theming, and a distraction-free Zen Mode.

## Tech Stack

- **Runtime:** Node 22+ (use `nvm use 22`)
- **Package manager:** Bun
- **Framework:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (utility-first, CSS custom properties for theme tokens)
- **State management:** Zustand 5
- **Editor:** CodeMirror 6 + `@uiw/codemirror-themes-all` (31 syntax themes)
- **Icons:** lucide-react (tree-shakable SVG icons)
- **Persistence:** IndexedDB via `idb-keyval`
- **Linter:** oxlint
- **Fonts:** JetBrains Mono (display/code) + IBM Plex Sans (body) via `next/font/google`

## Commands

```bash
bun install        # install dependencies
bun run dev        # start dev server (localhost:3000)
bun run build      # production build
bun run start      # start production server
bun run lint       # lint with oxlint
```

## Architecture

```
app/
├── layout.tsx               # Root layout (server component): <html>, <body>, fonts, metadata
├── page.tsx                 # Single page: "use client" wrapper rendering <App />
└── globals.css              # Tailwind directives + theme tokens (6 variants) + keyframes + base styles
src/
├── App.tsx                  # Root client component, hydrates stores, orchestrates layout
├── components/              # Client components (all marked "use client")
│   ├── CodeEditor.tsx       # CodeMirror 6 wrapper with 31 selectable themes, dynamic theming + user-configurable extensions
│   ├── HintPanel.tsx        # Progressive hint reveal
│   ├── LanguageSelector.tsx # Language tab selector (JS/Python/Go/Java active; Rust/C/C++ scaffolded)
│   ├── OutputPanel.tsx      # Code execution output display
│   ├── ProgressBar.tsx      # Completion progress indicator
│   ├── QuestionCard.tsx     # Question display with numbered title + examples
│   ├── QuestionsModal.tsx   # All-questions table modal with filters/sort
│   └── SettingsModal.tsx    # Tabbed settings modal (Editor / Appearance / Account)
├── store/                   # Zustand stores + IndexedDB layer (all "use client")
│   ├── themeStore.ts        # Theme mode (dark/light) + palette (emerald/ocean/amber)
│   ├── editorStore.ts       # Editor preferences (font, indentation, feature toggles, editorTheme, adaptAppTheme, zenFullscreen)
│   ├── completionStore.ts   # Question completion tracking
│   ├── questionStore.ts     # Current question selection + randomQuestion
│   ├── codeRunnerStore.ts   # Code execution state
│   └── db.ts                # IndexedDB persistence functions
├── runners/                 # Language-specific code execution (all "use client")
│   ├── javaRunner.ts        # Stub — Java not supported in browser (like Go)
│   ├── jsRunner.ts          # In-browser JS execution via Function()
│   ├── pythonRunner.ts      # In-browser Python via Pyodide (lazy-loaded)
│   └── goRunner.ts          # Stub — Go not supported in browser
├── themes/
│   └── editorThemeColors.ts # Maps each editor theme to app CSS variables for "Adapt App Theme" feature
├── data/
│   └── questions.json       # Question bank (75 Blind questions with keywords + 7-language scaffolds)
└── types/
    └── question.ts          # TypeScript interfaces
```

## Conventions

### Next.js App Router

The app uses Next.js App Router with a hybrid rendering strategy:
- **Server components:** `app/layout.tsx` handles `<html>`, `<body>`, font loading, and metadata.
- **Client components:** Everything under `src/` is marked `"use client"` since the app relies heavily on browser APIs (IndexedDB, CodeMirror, Pyodide, Fullscreen API).
- **Path alias:** `@/*` maps to `./src/*` (configured in `tsconfig.json`).

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

The theme system uses CSS custom properties with `[data-mode][data-palette]` attribute selectors on `<html>`. There are 3 palettes (emerald, ocean, amber) x 2 modes (dark, light) = 6 variants. Theme tokens are defined in `app/globals.css`. The `themeStore` applies attributes to the DOM and persists to IndexedDB.

**Editor themes:** CodeMirror supports 31 syntax themes via `@uiw/codemirror-themes-all` (Dracula, Nord, Monokai, etc.) plus an "auto" mode that reads CSS variables at editor creation time via `readCSSVar()` in `CodeEditor.tsx`.

**Adapt App Theme:** When enabled in Editor settings, the entire app's CSS variables are overridden to match the selected editor theme's colors (via inline styles on `<html>`). The color map lives in `src/themes/editorThemeColors.ts`. When active, the Appearance tab's mode/palette controls are disabled with an info notice.

### Zen Mode

Zen Mode strips the UI down to just the code editor filling the viewport. Activated via the eye icon in the topbar, exited via Escape or the floating exit button. An optional "Fullscreen" toggle in Appearance settings uses the browser Fullscreen API for true fullscreen. Exiting fullscreen (via browser chrome or Esc) also exits zen mode.

### CSS / Tailwind

- All styles use Tailwind CSS v4 utility classes applied directly in component JSX.
- Theme tokens (CSS custom properties) are defined in `app/globals.css` under `[data-mode][data-palette]` selectors.
- Reference theme variables via Tailwind arbitrary values: `bg-[var(--bg-primary)]`, `text-[var(--accent)]`.
- Custom `@theme` block in `app/globals.css` defines font families, border radii, and animation keyframes.
- Complex pseudo-element styles (toggle switches, range sliders, CodeMirror overrides) remain as plain CSS in `app/globals.css`.
- Never use `transition: all` — list properties explicitly via Tailwind's `transition-[prop]` syntax.
- Honor `prefers-reduced-motion` (handled in globals.css base styles).
- Use `overscroll-contain` on modals/overlays.
- Use `tabular-nums` for numeric displays.
- Use `text-balance` on headings.

### Accessibility

- Icon-only buttons must have `aria-label`.
- Decorative SVGs must have `aria-hidden="true"`.
- All interactive elements must have visible `focus-visible` states.
- Modals must close on Escape and overlay click.

### IndexedDB Keys

All keys are prefixed with `sighted75:` — `sighted75:completed`, `sighted75:theme`, `sighted75:editor` (includes editorTheme, adaptAppTheme, zenFullscreen), `sighted75:currentQuestion`, `sighted75:solution:{id}`.

### Typography

- Use `\u2026` (ellipsis character) instead of `...` in UI text.
- Loading states should end with ellipsis: `"Running\u2026"`, `"Loading\u2026"`.

## Skills

**Always consult the skills in `.agents/skills/` before making changes.** These contain binding guidelines for this project:

- **`.agents/skills/vercel-react-best-practices/`** — React performance optimization rules (57 rules across 8 categories). Read `AGENTS.md` in that directory for the full guide. Apply these when writing or refactoring any React code.
- **`.agents/skills/web-design-guidelines/`** — Vercel Web Interface Guidelines for accessibility, animation, forms, typography, and more. Fetch the latest rules from the source URL in `SKILL.md` and audit UI code against them.
- **`.agents/skills/ui-ux-pro-max/`** — Design system generation tool. Use when redesigning UI or creating new visual components. Enforces no-emoji icons (use SVGs), specific font/palette choices, and layout patterns.

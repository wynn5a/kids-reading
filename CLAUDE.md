# CLAUDE.md

Kids' Chinese reading app (Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4). Lessons are extracted from a PDF into `src/data/lessons.json`; progress lives in `localStorage`.

## Styling gotcha: Tailwind size-name collision (important)

`src/app/globals.css` defines a **named spacing scale** in its `@theme` block:
`--spacing-md: 16px`, `--spacing-lg: 24px`, `--spacing-xl: 32px`, plus `xs/sm/xxl/…`.

In Tailwind v4 these names shadow the built-in **container-width** scale, which shares
the same `md`/`lg`/`xl` names. As a result, width utilities resolve to the *spacing*
value, not the container value:

- `max-w-md` → `max-width: 16px` (NOT 28rem) — silently collapses layouts
- `max-w-lg` → 24px, `max-w-xl` → 32px, etc.

`max-w-2xl`/`max-w-3xl` still work as container widths only because no matching
`--spacing-2xl`/`--spacing-3xl` token exists to shadow them.

**Rule:** never use `max-w-md`/`max-w-lg`/`max-w-xl` (or the `w-`/`min-w-` equivalents)
expecting a container width. Use an explicit arbitrary value instead, e.g.
`max-w-[28rem]`. See the fix in `src/components/reading/LessonSummary.tsx`.

## Commands

- `pnpm dev` — dev server (localhost:3000)
- `pnpm build` — production build
- `pnpm test` — Vitest unit/component tests (`globals: true`, jsdom)
- `pnpm test:e2e` — Playwright e2e

## Conventions

- Icons: `lucide-react` components only — no emoji.
- Chinese text uses the `.cjk` class for the correct font stack.

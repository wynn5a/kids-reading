# CLAUDE.md

Kids' Chinese reading app (Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4). Lessons are extracted from a PDF into `src/data/lessons.json`; progress lives in `localStorage`.

## Single source of truth: the textbook PDF

Text **and** pinyin both come from `pdf/义务教育教科书·语文一年级上册.pdf` — the
book's own printed pinyin is authoritative (轻声, 儿化 like 会→`huìr`/儿→`""`,
and the deliberately pinyin-free passages in lesson 14). The chain:

```
PDF → scripts/extract_lessons.py → src/data/lessons.json → page render (RubyText)
                                                         → TTS clips (same tokens)
```

`src/data/lessons.json` and `src/data/audio-manifest.json` are **generated —
never hand-edit them**. To change what's displayed/spoken, fix the extraction
and run `pnpm gen` (= `gen:lessons` + `gen:tts`); for pronunciation-only fixes
use `tts-overrides.json`. TTS regeneration is content-aware, so only lines
whose text actually changed are re-synthesized.

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
- `pnpm test` — Vitest unit/component tests (`globals: true`, jsdom; also covers `scripts/**/*.test.mjs`)
- `pnpm test:e2e` — Playwright e2e
- `pnpm gen` — full PDF→page+audio sync (`gen:lessons` then `gen:tts`)
- `pnpm gen:lessons` — re-extract lessons from the PDF (needs `.pdfvenv`, see `scripts/README.md`)
- `pnpm gen:tts` — sync line-by-line TTS audio (see below)

## TTS narration

Each visual line of every lesson has a pre-generated MP3 at
`public/audio/<lessonId>-<lineIndex>.mp3`, synthesized by `scripts/gen-tts.mjs`
via Xiaomi MiMo (`mimo-v2.5-tts`, voice `茉莉`). The `LessonPlayer` component
plays them (play/pause whole lesson with auto-advance + highlight, tap-a-line,
replay, 慢/正常 speed via `playbackRate`).

- Run `pnpm gen:tts` after `lessons.json` changes; it re-synthesizes a clip
  only when its MP3 is missing **or its text no longer matches what
  `src/data/audio-manifest.json` recorded** (`--force` to redo all). The
  skip/synth decision is `planClips` in `scripts/tts-plan.mjs` (unit-tested);
  the clip text comes from the same `lineText` in `src/data/line-text.ts`
  that the app uses — do not duplicate it.
- Requires `MIMO_API_KEY` in `.env.local` (gitignored) and `ffmpeg` on PATH —
  only when at least one clip actually needs synthesizing.
- Fix a mispronounced 多音字 by adding the line's key to
  `src/data/tts-overrides.json` (`"<id>-<i>": "reworded text"`) and re-running;
  the changed text regenerates just that clip.

## Conventions

- Icons: `lucide-react` components only — no emoji.
- Chinese text uses the `.cjk` class for the correct font stack.

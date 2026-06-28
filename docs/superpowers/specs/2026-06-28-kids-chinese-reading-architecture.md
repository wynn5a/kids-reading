# Technical Architecture — 拼音阅读 (Kids Chinese Reading)

**Date:** 2026-06-28
**Companion to:** `2026-06-28-kids-chinese-reading-design.md`
**Status:** Draft for review

---

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | already in repo |
| UI | React 19 | already in repo |
| Styling | Tailwind CSS v4 | existing editorial + pastel design system |
| Language | TypeScript 5 (strict) | |
| Content pipeline | Python 3 + PyMuPDF (`fitz`) | offline, build-time only |
| Persistence | Browser `localStorage` | no backend, no DB |
| Package manager | pnpm | `pnpm-lock.yaml` present |
| Hosting | Static / edge (e.g. Vercel) | no server runtime required |

**Key architectural property:** there is **no application backend**. The PDF is processed
offline into static JSON; the running app is a client-rendered/statically-generated Next.js
site whose only mutable state lives in the browser.

## 2. System Overview

```
                 BUILD TIME (offline, run by a developer)
  ┌────────────────────────────────────────────────────────────┐
  │  pdf/义务教育...上册.pdf                                       │
  │            │                                                  │
  │            ▼                                                  │
  │  scripts/extract_lessons.py  (PyMuPDF + cipher decode)        │
  │            │                                                  │
  │            ▼                                                  │
  │  src/data/lessons.json   ◄── committed to git                │
  └────────────────────────────────────────────────────────────┘
                              │  imported as a static module
                              ▼
                 RUNTIME (browser / static site)
  ┌────────────────────────────────────────────────────────────┐
  │  Next.js App Router                                          │
  │    /            Home dashboard      (Server Component shell  │
  │    /lesson/[id] Reading screen       + Client islands)       │
  │            │                                                 │
  │            ▼                                                 │
  │  useProgress() hook  ◄──►  localStorage (read state, streak) │
  └────────────────────────────────────────────────────────────┘
```

## 3. Content Pipeline (build-time)

### 3.1 `scripts/extract_lessons.py`
A standalone script, **not** part of the Next.js build. Run manually (or via a documented
pnpm script that shells out to Python) whenever the source or decode logic changes.

Steps:
1. **Open PDF** with PyMuPDF; iterate pages.
2. **Locate 课文 pages.** Use the table of contents (pages ~4–5) to map lesson number/title
   to page ranges, then confirm by scanning page text for the lesson header pattern.
3. **Extract token stream.** `page.get_text()` yields Chinese characters each immediately
   followed by their pinyin token (observed ordering). Walk the stream pairing
   `char → pinyin`. Punctuation produces a token with empty pinyin.
4. **Decode pinyin cipher.** Apply a substitution table mapping font substitute letters to
   real tone-marked vowels (`A→ǎ, E→ē, F→è, G→ǒ, J→ǐ, K→ì, S→à, W→á, …`). The table is a
   module-level constant, built and validated against the full toned-vowel set
   (ā á ǎ à / ē é ě è / ī í ǐ ì / ō ó ǒ ò / ū ú ǔ ù / ü ǘ ǚ ǜ).
5. **Group into lines and lessons.** Use layout/line-break cues from `get_text("dict")`
   (block/line `y` positions) to segment lines; lesson boundaries from step 2.
6. **Validate & emit.** Any token still containing a substitute character is logged as a
   decode gap (non-zero exit if gaps exist). Output pretty-printed `src/data/lessons.json`.

### 3.2 Output contract
`src/data/lessons.json` = `Lesson[]` exactly as defined in the design doc. This file is the
**single contract** between the pipeline and the app; the app has no other knowledge of the
PDF.

### 3.3 Reproducibility
- Python deps pinned in `scripts/requirements.txt` (`pymupdf`).
- Script is deterministic; re-running on the same PDF yields identical JSON.
- A short `scripts/README.md` documents how to run it and how to extend the cipher table.

## 4. Runtime Architecture

### 4.1 Rendering strategy
- Both routes are **statically generated** (no server data dependency).
  `/lesson/[id]` uses `generateStaticParams()` over `lessons.json`.
- Lesson **content** (title, author, ruby text) renders in **Server Components** — pure,
  data-driven, no client JS needed for the text itself.
- **Progress-dependent UI is client-only.** localStorage is unavailable during SSG, so any
  component reading progress is a Client Component that resolves state after mount, showing
  a neutral skeleton/placeholder until then (avoids hydration mismatch).

### 4.2 Module / directory layout
```
src/
  app/
    layout.tsx                # root layout (fonts incl. CJK fallback)
    page.tsx                  # Home dashboard (server shell)
    lesson/[id]/page.tsx      # Reading screen (server: renders content)
  data/
    lessons.json              # generated content
    lessons.ts                # typed import + helpers (getLesson, getAllLessons)
  lib/
    progress.ts               # PURE derivation: unlocked(), streak(), completion()
    use-progress.ts           # client hook: localStorage I/O + state, uses progress.ts
    cn.ts                     # (existing)
  components/
    ui/                       # (existing design-system components)
    reading/
      RubyText.tsx            # renders Token[][] as <ruby>/<rt>
    home/
      CompletionBar.tsx
      ContinueCard.tsx        # client (needs progress)
      LessonGrid.tsx          # client (needs lock state)
      StreakBadge.tsx         # client
      ActivityHeatmap.tsx     # client
scripts/
  extract_lessons.py
  requirements.txt
  README.md
```

### 4.3 State management
- **Source of truth at runtime:** `localStorage["kids-reading:progress:v1"]` holding
  `{ readLessonIds, activity }`.
- **`progress.ts`** — framework-free pure functions:
  - `isUnlocked(id, readLessonIds)`
  - `nextLessonId(lessons, readLessonIds)` (first unlocked & unread)
  - `completion(lessons, readLessonIds)` → `{ done, total, pct }`
  - `currentStreak(activity, today)` and `heatmapCells(activity, today, days=90)`
  - `markRead(progress, id, today)` → new `Progress` (immutable update)
- **`use-progress.ts`** — `useProgress()` client hook:
  - loads/parses on mount (guarded for SSR — returns `loading` until hydrated),
  - exposes derived selectors + `markRead(id)` writer,
  - persists via `useEffect` on change; tolerates corrupt/missing JSON by resetting to empty.
- Versioned key (`:v1`) allows a future migration without colliding with old data.

### 4.4 Data flow — "mark as read"
```
Reading screen button click
  → useProgress().markRead(id)
      → progress.ts markRead(progress, id, todayISO)  (pure)
      → setState(newProgress)
      → useEffect persists to localStorage
  → UI: Home selectors recompute (unlock id+1, completion, streak, heatmap)
  → navigate: offer next lesson or return Home
```
Date is computed client-side as local `YYYY-MM-DD` (no timezone server dependency).

## 5. Key Components

- **`RubyText`** — input `lines: Token[][]`. Emits semantic `<ruby>` per character, `<rt>`
  for non-empty pinyin; punctuation as plain text. Presentational, no state. Reused on the
  reading screen (and could preview elsewhere).
- **`ContinueCard` / `LessonGrid`** — consume `lessons` (static) + `useProgress()` (client);
  compute lock/read state via `progress.ts` selectors.
- **`ActivityHeatmap`** — pure render of `heatmapCells(...)`; intensity buckets mapped to
  pastel/ink shades from the design system.

## 6. Routing & Guards

- `/lesson/[id]`: `id` parsed to int; if not a valid lesson, `notFound()`.
- **Lock guard is client-side** (lock state lives in localStorage): if a user opens a locked
  lesson URL directly, a client check redirects Home (or shows a "locked" notice). Content is
  not secret — this is UX gating, not security.

## 7. Error Handling & Edge Cases

| Case | Handling |
|---|---|
| Corrupt/absent localStorage | hook resets to empty `Progress`; never throws |
| SSR/SSG has no `window` | hook returns `loading`; UI shows skeleton until mount |
| Invalid `/lesson/[id]` | `notFound()` |
| Direct nav to locked lesson | client redirect Home / locked notice |
| Decode gap in pipeline | script logs offending tokens, exits non-zero; bad data never ships |
| All lessons read | Continue card shows completed state; `nextLessonId` returns null |

## 8. Testing Strategy

- **Pure logic (highest value):** unit tests for `progress.ts` — unlock, next, completion,
  streak (incl. gaps, today-vs-yesterday boundary), heatmap buckets, `markRead` immutability.
- **Pipeline:** a small fixture test asserting the cipher decode table maps every known
  substitute to the correct toned vowel; a sanity check that emitted JSON matches the
  `Lesson` shape and has no residual substitute characters.
- **Component smoke:** `RubyText` renders correct `<rt>` count; locked card is disabled.
- Manual spot-check of decoded pinyin vs the rendered PDF for 2–3 lessons before acceptance.

## 9. Performance

- Content is static and small (a Grade-1 textbook's 课文 is tens of KB of JSON) — import
  directly; no lazy loading needed initially. If JSON grows, split per-lesson imports.
- No runtime PDF/parse cost. No network after initial load.
- Heatmap/grid are O(lessons + 90 days) — trivial.

## 10. Deployment

- Standard Next.js build (`pnpm build`) produces a static/edge-deployable site.
- The Python pipeline is **not** invoked during deploy; `lessons.json` is committed.
  Regenerating content is an explicit, separate developer action.
- No env vars, secrets, or backend services required.

## 11. Future-Proofing (not built now)

- Versioned storage key enables schema migration.
- `Lesson` model + per-lesson static params generalize to multiple books (`/book/[slug]/...`).
- Adding TTS later = an additive client feature over existing `Token`/`RubyText` data.
- A backend + auth could later sync the same `Progress` shape without changing the data model.

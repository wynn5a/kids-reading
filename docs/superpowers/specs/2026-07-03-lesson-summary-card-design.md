# Lesson Summary Card — Design

**Date:** 2026-07-03
**Status:** Approved, ready for planning

## Goal

Make finishing a lesson feel like an accomplishment. When a child taps “读完了”
on a lesson page, replace the current fire-and-navigate behavior with a
celebratory **full-screen summary overlay** that shows what they achieved and
lets them choose when to move on.

## Current behavior (baseline)

`src/components/reading/MarkReadControls.tsx`: tapping “读完了” calls `markRead`,
fires confetti (`celebrate` for a normal lesson, `celebrateBig` for the last),
then auto-navigates after 900ms to the next lesson or home. There is no summary.

## Decisions (from brainstorming)

- **Words metric:** cumulative **unique CJK characters** across all lessons read
  so far (“认识了 X 个字”). No double-counting of common characters; punctuation
  and pinyin excluded.
- **Display:** full-screen overlay, **child-controlled dismissal** (no
  auto-navigate).
- **Card content:** reading progress bar, characters learned (with a per-lesson
  “+N” bump), streak/days, and an encouraging message with a star/badge visual
  scaled to milestones.

## Architecture

Two layers, kept separate so data logic stays pure and testable and the overlay
stays purely visual.

### 1. Pure stat helpers — `src/lib/progress.ts`

Add:

- `learnedCharCount(lessons: Lesson[], readLessonIds: number[]): number`
  Counts **distinct** CJK characters (`/[一-鿿]/`) across every read
  lesson. Punctuation, spaces, and pinyin are excluded because they are not the
  `char` of a CJK token / fail the regex.
- `celebrationMessage(pct: number, isLast: boolean): string`
  Returns a cheerful line. A special message at `isLast` / 100%; otherwise a
  deterministic pick from a small pool (varied but stable for the same input, so
  it is testable — no `Math.random`).

Reuse existing:

- `completion(lessons, readLessonIds)` → `{ done, total, pct }` for the bar.
- `currentStreak(activity, today)` → streak count.
- `markRead(progress, id, today)` (pure) → the post-completion `Progress`, used
  to derive all “after” stats before persisting.

### 2. Overlay component — `src/components/reading/LessonSummary.tsx`

Client, **presentational only** (no storage/router access — receives data and
callbacks via props).

Props:

```ts
type LessonSummaryProps = {
  done: number;
  total: number;
  pct: number;
  totalChars: number;   // cumulative unique CJK chars learned
  newChars: number;     // added by this lesson (0 when re-reading)
  streak: number;       // consecutive days
  isLast: boolean;      // finished the final lesson
  message: string;
  onNext: () => void;   // advance to next lesson
  onHome: () => void;   // return home
};
```

Layout — follows the existing Figma-editorial system (monochrome + pastel
blocks, hairline borders, no shadows, `rounded-lg/xl`, pill radii, `.cjk` font)
and uses **lucide-react icons** (no emoji, consistent with the recent refactor):

- Dimmed backdrop covering the viewport; centered `Card` that pops in.
- **Header:** `PartyPopper` icon (or `Trophy` when `isLast`) + `message`, plus a
  row of `Star` icons (larger/celebratory on the last lesson).
- **Progress bar:** the `CompletionBar` visual — “读完 {done} / {total}”, a
  filled pill bar at `{pct}%`, and the percentage.
- **Characters learned:** large “认识了 {totalChars} 个字”, with a small pastel
  “+{newChars}” accent shown only when `newChars > 0`.
- **Streak:** `Flame` icon + “连续阅读 {streak} 天”.
- **Actions:** primary button — “下一课” normally, an “全部读完啦” celebratory
  label/state when `isLast` (→ `onHome`); secondary “返回首页”.
- **A11y:** `role="dialog"`, `aria-modal="true"`, an accessible label, primary
  button auto-focused on mount, `Escape` triggers `onHome`.

### 3. Wiring — `MarkReadControls.tsx`

On “读完了” (guard against double-tap):

1. Compute `today` and `post = markRead(progress, id, today)` (pure).
2. Persist via the hook’s `markRead(id)`.
3. Fire confetti: `celebrateBig()` when `isLast`, else `celebrate()`.
4. Derive stats from `post` (and `getAllLessons()`):
   - `{ done, total, pct } = completion(all, post.readLessonIds)`
   - `totalChars = learnedCharCount(all, post.readLessonIds)`
   - `newChars = alreadyRead ? 0 : totalChars - learnedCharCount(all, post.readLessonIds.filter(x => x !== id))`
   - `streak = currentStreak(post.activity, today)`
   - `isLast = nextId === null`
   - `message = celebrationMessage(pct, isLast)`
5. Set state to show `<LessonSummary … onNext={() => router.push(\`/lesson/${nextId}\`)} onHome={() => router.push("/")} />`.

The existing 900ms `setTimeout` auto-navigate is removed. `MarkReadControls`
imports `getAllLessons` directly (the lessons JSON is a plain client-importable
module, as used elsewhere).

### 4. Animation — `src/app/globals.css`

Add keyframes for a card pop-in (scale + fade) and a gentle star bounce, and the
matching `--animate-*` tokens / utility classes in the `@theme` block, following
the existing `marquee` pattern. Gate the motion behind
`@media (prefers-reduced-motion: no-preference)` so the card simply appears for
users who prefer reduced motion. Confetti is already reduced-motion-safe.

## Testing

- **`src/lib/progress.test.ts`**
  - `learnedCharCount`: dedups repeated characters across lessons; excludes
    punctuation/pinyin; empty when nothing read.
  - `celebrationMessage`: returns the special message at `isLast`/100%; returns a
    non-empty stable string otherwise.
- **`src/components/reading/LessonSummary.test.tsx`**
  - Renders characters-learned count, “+N”, progress “读完 X / Y”, and streak.
  - Shows both action buttons; `onNext`/`onHome` fire on click.
  - Last-lesson variant renders the trophy/“全部读完啦” state.
- **`e2e/reading.spec.ts`** (update)
  - Finishing a lesson shows the summary card (no immediate navigation).
  - “下一课” advances to the next lesson.

## Out of scope (YAGNI)

- No changes to the progress storage schema or `localStorage` key.
- No new persisted metrics — all stats are derived on the fly from existing
  `readLessonIds` + `activity`.
- No per-character mastery tracking, quizzes, or sharing.

# Lesson Summary Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fire-and-navigate "读完了" behavior with a celebratory, child-controlled full-screen summary overlay showing reading progress, characters learned, and streak.

**Architecture:** Two layers — pure, unit-tested stat helpers in `src/lib/progress.ts`, and a purely presentational `LessonSummary` overlay component. `MarkReadControls` derives stats from the pure `markRead` post-state, fires the existing confetti, and shows the overlay instead of auto-navigating.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, lucide-react icons, canvas-confetti, Vitest + Testing Library, Playwright.

## Global Constraints

- Icons: use `lucide-react` components only — **no emoji** (matches recent refactor).
- Styling: Figma-editorial system — monochrome + pastel color blocks, hairline borders, **no shadows**, `rounded-lg/xl`, pill radii; Chinese text uses the `.cjk` class.
- All UI copy is in **Chinese**.
- No changes to the progress storage schema or the `localStorage` key `kids-reading:progress:v1`.
- No `Math.random` in stat helpers — keep them deterministic and testable.
- Motion must be gated behind `@media (prefers-reduced-motion: no-preference)`.
- Run tests with `pnpm test` (Vitest) and `pnpm test:e2e` (Playwright).

---

## File Structure

- `src/lib/progress.ts` (modify) — add `learnedCharCount` and `celebrationMessage` pure helpers.
- `src/lib/progress.test.ts` (modify) — tests for the two new helpers.
- `src/components/reading/LessonSummary.tsx` (create) — presentational overlay.
- `src/components/reading/LessonSummary.test.tsx` (create) — component tests.
- `src/components/reading/MarkReadControls.tsx` (modify) — compute stats + show overlay.
- `src/app/globals.css` (modify) — pop-in / star-bounce keyframes + motion tokens.
- `e2e/reading.spec.ts` (modify) — assert card appears and "下一课" advances.

---

## Task 1: `learnedCharCount` helper

**Files:**
- Modify: `src/lib/progress.ts`
- Test: `src/lib/progress.test.ts`

**Interfaces:**
- Consumes: existing `Lesson` type from `@/data/types` (`{ id, number, title, author?, lines: Token[][] }`, `Token = { char, pinyin }`).
- Produces: `learnedCharCount(lessons: Lesson[], readLessonIds: number[]): number` — count of distinct CJK characters across all read lessons.

- [ ] **Step 1: Write the failing test**

The file already imports `test, expect` from vitest and `Lesson` from `@/data/types`, and `globals: true` is set (so `describe`/`it` are available without importing). Add `learnedCharCount` to the existing named import from `@/lib/progress`. Then append:

```ts
function lesson(id: number, chars: string[][]): Lesson {
  return {
    id,
    number: String(id),
    title: "t",
    lines: chars.map((line) => line.map((c) => ({ char: c, pinyin: "" }))),
  };
}

describe("learnedCharCount", () => {
  const lessons = [
    lesson(1, [["小", "牛", "。"]]),
    lesson(2, [["小", "马", "，"]]), // 小 repeats; 。， are punctuation
  ];

  it("counts distinct CJK characters across read lessons", () => {
    expect(learnedCharCount(lessons, [1, 2])).toBe(3); // 小 牛 马
  });

  it("excludes punctuation and empty when nothing read", () => {
    expect(learnedCharCount(lessons, [1])).toBe(2); // 小 牛 (not 。)
    expect(learnedCharCount(lessons, [])).toBe(0);
  });

  it("ignores unread lessons", () => {
    expect(learnedCharCount(lessons, [2])).toBe(2); // 小 马
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/progress.test.ts`
Expected: FAIL — `learnedCharCount is not a function` (or import error).

- [ ] **Step 3: Write minimal implementation**

Add to `src/lib/progress.ts` (near the other lesson-based helpers like `completion`):

```ts
const CJK = /[一-鿿]/;

/** Count of distinct CJK characters across every read lesson. */
export function learnedCharCount(lessons: Lesson[], readLessonIds: number[]): number {
  const set = new Set<string>();
  for (const l of lessons) {
    if (!readLessonIds.includes(l.id)) continue;
    for (const line of l.lines) {
      for (const t of line) {
        if (CJK.test(t.char)) set.add(t.char);
      }
    }
  }
  return set.size;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/progress.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/progress.ts src/lib/progress.test.ts
git commit -m "feat: add learnedCharCount progress helper"
```

---

## Task 2: `celebrationMessage` helper

**Files:**
- Modify: `src/lib/progress.ts`
- Test: `src/lib/progress.test.ts`

**Interfaces:**
- Produces: `celebrationMessage(pct: number, isLast: boolean): string` — a non-empty cheerful line; a special message when `isLast` or `pct >= 100`; otherwise a deterministic pick from a fixed pool keyed by `pct` (no randomness).

- [ ] **Step 1: Write the failing test**

Add `celebrationMessage` to the existing named import from `@/lib/progress`, then append:

```ts
describe("celebrationMessage", () => {
  it("returns the finale message when finishing the last lesson", () => {
    expect(celebrationMessage(100, true)).toBe("全部读完啦！你太了不起了！");
  });

  it("returns the finale message at 100% even if not flagged last", () => {
    expect(celebrationMessage(100, false)).toBe("全部读完啦！你太了不起了！");
  });

  it("returns a non-empty, stable message otherwise", () => {
    const m = celebrationMessage(40, false);
    expect(m.length).toBeGreaterThan(0);
    expect(celebrationMessage(40, false)).toBe(m); // deterministic
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/progress.test.ts`
Expected: FAIL — `celebrationMessage is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add to `src/lib/progress.ts`:

```ts
const CHEERS = [
  "太棒了！继续加油！",
  "读得真好！",
  "你真厉害！",
  "又学会一课啦！",
];

/** A cheerful line for the summary card. Finale message at 100% / last lesson. */
export function celebrationMessage(pct: number, isLast: boolean): string {
  if (isLast || pct >= 100) return "全部读完啦！你太了不起了！";
  return CHEERS[pct % CHEERS.length];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/progress.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/progress.ts src/lib/progress.test.ts
git commit -m "feat: add celebrationMessage progress helper"
```

---

## Task 3: Motion keyframes in global CSS

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: CSS animation utilities `animate-pop-in` and `animate-star-bounce` (via `--animate-pop-in` / `--animate-star-bounce` theme tokens), applied only when the user has not requested reduced motion.

- [ ] **Step 1: Add motion tokens to the `@theme` block**

In `src/app/globals.css`, under the `/* ---- Motion ---- */` comment (after `--animate-marquee: ...;`), add:

```css
  --animate-pop-in: pop-in 0.36s cubic-bezier(0.18, 0.89, 0.32, 1.28) both;
  --animate-star-bounce: star-bounce 0.6s ease-in-out;
```

- [ ] **Step 2: Add keyframes**

After the existing `@keyframes marquee { ... }` block, add:

```css
@keyframes pop-in {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes star-bounce {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}

/* Motion only when the user hasn't asked to reduce it. */
@media (prefers-reduced-motion: reduce) {
  .animate-pop-in { animation: none; }
  .animate-star-bounce { animation: none; }
}
```

- [ ] **Step 3: Verify the app still builds**

Run: `pnpm build`
Expected: build succeeds (no CSS parse errors).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add pop-in and star-bounce keyframes"
```

---

## Task 4: `LessonSummary` overlay component

**Files:**
- Create: `src/components/reading/LessonSummary.tsx`
- Test: `src/components/reading/LessonSummary.test.tsx`

**Interfaces:**
- Consumes: `Card` from `@/components/ui`, `Button` from `@/components/ui`, icons from `lucide-react` (`PartyPopper`, `Trophy`, `Star`, `Flame`, `BookOpen`).
- Produces:

```ts
export type LessonSummaryProps = {
  done: number;
  total: number;
  pct: number;
  totalChars: number;
  newChars: number;
  streak: number;
  isLast: boolean;
  message: string;
  onNext: () => void;
  onHome: () => void;
};
export function LessonSummary(props: LessonSummaryProps): JSX.Element;
```

- [ ] **Step 1: Write the failing test**

Create `src/components/reading/LessonSummary.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LessonSummary } from "./LessonSummary";

const base = {
  done: 3,
  total: 10,
  pct: 30,
  totalChars: 42,
  newChars: 7,
  streak: 5,
  isLast: false,
  message: "太棒了！继续加油！",
  onNext: () => {},
  onHome: () => {},
};

describe("LessonSummary", () => {
  it("shows message, progress, characters learned and streak", () => {
    render(<LessonSummary {...base} />);
    expect(screen.getByText("太棒了！继续加油！")).toBeInTheDocument();
    expect(screen.getByText("读完 3 / 10")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("+7")).toBeInTheDocument();
    expect(screen.getByText("连续阅读 5 天")).toBeInTheDocument();
  });

  it("hides the +N bump when no new characters", () => {
    render(<LessonSummary {...base} newChars={0} />);
    expect(screen.queryByText("+0")).not.toBeInTheDocument();
  });

  it("fires callbacks from the action buttons", () => {
    const onNext = vi.fn();
    const onHome = vi.fn();
    render(<LessonSummary {...base} onNext={onNext} onHome={onHome} />);
    fireEvent.click(screen.getByRole("button", { name: "下一课" }));
    fireEvent.click(screen.getByRole("button", { name: "返回首页" }));
    expect(onNext).toHaveBeenCalledOnce();
    expect(onHome).toHaveBeenCalledOnce();
  });

  it("renders the finale state on the last lesson", () => {
    const onHome = vi.fn();
    render(<LessonSummary {...base} isLast pct={100} message="全部读完啦！你太了不起了！" onHome={onHome} />);
    expect(screen.getByText("全部读完啦！你太了不起了！")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "全部读完啦" }));
    expect(onHome).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/reading/LessonSummary.test.tsx`
Expected: FAIL — cannot find module `./LessonSummary`.

- [ ] **Step 3: Write the component**

Create `src/components/reading/LessonSummary.tsx`:

```tsx
"use client";
import { useEffect, useRef } from "react";
import { PartyPopper, Trophy, Star, Flame } from "lucide-react";
import { Card, Button } from "@/components/ui";

export type LessonSummaryProps = {
  done: number;
  total: number;
  pct: number;
  totalChars: number;
  newChars: number;
  streak: number;
  isLast: boolean;
  message: string;
  onNext: () => void;
  onHome: () => void;
};

export function LessonSummary({
  done,
  total,
  pct,
  totalChars,
  newChars,
  streak,
  isLast,
  message,
  onNext,
  onHome,
}: LessonSummaryProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onHome();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onHome]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="本课小结"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
    >
      <Card className="animate-pop-in w-full max-w-md rounded-xl p-8 text-center">
        <div className="flex justify-center">
          {isLast ? (
            <Trophy className="h-14 w-14" strokeWidth={1.5} />
          ) : (
            <PartyPopper className="h-14 w-14" strokeWidth={1.5} />
          )}
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <Star key={i} className="animate-star-bounce h-6 w-6 fill-current" strokeWidth={1.5} />
          ))}
        </div>

        <h2 className="cjk mt-5 text-2xl font-bold">{message}</h2>

        <div className="mt-8 text-left">
          <div className="flex items-baseline justify-between">
            <span className="cjk text-sm text-neutral-500">阅读进度</span>
            <span className="cjk text-sm font-medium">读完 {done} / {total}</span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-pill bg-surface-soft">
            <div className="h-full rounded-pill bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6">
          <div className="cjk">
            <p className="text-sm text-neutral-500">认识了</p>
            <p className="mt-1 flex items-baseline justify-center gap-2">
              <span className="text-4xl font-bold">{totalChars}</span>
              <span className="text-lg">个字</span>
              {newChars > 0 && (
                <span className="rounded-pill bg-block-lime px-2 py-0.5 text-sm font-semibold">
                  +{newChars}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="cjk mt-6 flex items-center justify-center gap-2 text-neutral-700">
          <Flame className="h-5 w-5" strokeWidth={1.5} />
          <span>连续阅读 {streak} 天</span>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {isLast ? (
            <Button ref={primaryRef} onClick={onHome}>全部读完啦</Button>
          ) : (
            <>
              <Button ref={primaryRef} onClick={onNext}>下一课</Button>
              <Button variant="secondary" onClick={onHome}>返回首页</Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/reading/LessonSummary.test.tsx`
Expected: PASS.

> If the test fails because `Button` does not forward a `ref`, check `src/components/ui/button.tsx`. If it is not a `forwardRef`, replace the `ref`-based focus: remove `primaryRef`, give the primary button `data-autofocus`, and in the effect do `document.querySelector<HTMLButtonElement>('[data-autofocus]')?.focus()`. Re-run the test.

- [ ] **Step 5: Commit**

```bash
git add src/components/reading/LessonSummary.tsx src/components/reading/LessonSummary.test.tsx
git commit -m "feat: add LessonSummary overlay component"
```

---

## Task 5: Wire the summary into `MarkReadControls`

**Files:**
- Modify: `src/components/reading/MarkReadControls.tsx`

**Interfaces:**
- Consumes: `learnedCharCount`, `celebrationMessage`, `completion`, `currentStreak`, `markRead as markReadPure`, `todayISO` from `@/lib/progress`; `getAllLessons` from `@/data/lessons`; `LessonSummary` from `./LessonSummary`; existing `celebrate`, `celebrateBig`.
- Produces: unchanged public component signature `MarkReadControls({ id, nextId })`.

- [ ] **Step 1: Replace the component body**

Rewrite `src/components/reading/MarkReadControls.tsx` to compute stats and render the overlay instead of auto-navigating:

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useProgress } from "@/lib/use-progress";
import {
  isUnlocked,
  completion,
  currentStreak,
  learnedCharCount,
  celebrationMessage,
  markRead as markReadPure,
  todayISO,
} from "@/lib/progress";
import { getAllLessons } from "@/data/lessons";
import { celebrate, celebrateBig } from "@/lib/celebrate";
import { LessonSummary, type LessonSummaryProps } from "./LessonSummary";

type Stats = Omit<LessonSummaryProps, "onNext" | "onHome">;

export function MarkReadControls({ id, nextId }: { id: number; nextId: number | null }) {
  const router = useRouter();
  const { progress, loaded, markRead } = useProgress();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (loaded && !isUnlocked(id, progress.readLessonIds)) {
      router.replace("/");
    }
  }, [loaded, id, progress.readLessonIds, router]);

  if (!loaded) return null;

  const alreadyRead = progress.readLessonIds.includes(id);

  const finish = () => {
    if (stats) return;
    const today = todayISO();
    const all = getAllLessons();
    const post = markReadPure(progress, id, today);
    markRead(id);

    const isLast = nextId === null;
    if (isLast) celebrateBig();
    else celebrate();

    const { done, total, pct } = completion(all, post.readLessonIds);
    const totalChars = learnedCharCount(all, post.readLessonIds);
    const newChars = alreadyRead
      ? 0
      : totalChars - learnedCharCount(all, post.readLessonIds.filter((x) => x !== id));

    setStats({
      done,
      total,
      pct,
      totalChars,
      newChars,
      streak: currentStreak(post.activity, today),
      isLast,
      message: celebrationMessage(pct, isLast),
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button onClick={finish} disabled={!!stats}>
          {alreadyRead ? "再读一遍并继续" : "读完了"}
        </Button>
        <Button variant="secondary" onClick={() => router.push("/")}>
          返回首页
        </Button>
      </div>

      {stats && (
        <LessonSummary
          {...stats}
          onNext={() => router.push(nextId ? `/lesson/${nextId}` : "/")}
          onHome={() => router.push("/")}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify unit tests + build**

Run: `pnpm test && pnpm build`
Expected: all Vitest suites PASS; build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/reading/MarkReadControls.tsx
git commit -m "feat: show lesson summary card on finish"
```

---

## Task 6: Update the reading e2e test

**Files:**
- Modify: `e2e/reading.spec.ts`

**Interfaces:**
- Consumes: the rendered app; the summary dialog (`role="dialog"`, label "本课小结") and its "下一课" button.

- [ ] **Step 1: Replace the "advances to lesson 2" test**

In `e2e/reading.spec.ts`, the existing test `"marking read advances to lesson 2"` (lines 11–15) asserts navigation happens immediately after clicking "读完了". That is now wrong — the summary card appears first. Replace that test's body with:

```ts
test("finishing shows the summary card, then advances to lesson 2", async ({ page }) => {
  await page.goto("/lesson/1");
  await page.getByRole("button", { name: "读完了" }).click();

  const dialog = page.getByRole("dialog", { name: "本课小结" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/读完 \d+ \/ \d+/)).toBeVisible();

  await dialog.getByRole("button", { name: "下一课" }).click();
  await expect(page).toHaveURL(/\/lesson\/2$/);
});
```

Leave the other three tests in the file unchanged.

- [ ] **Step 2: Run the e2e suite**

Run: `pnpm test:e2e`
Expected: reading spec PASS. (If Playwright browsers are not installed, run `pnpm exec playwright install` first.)

- [ ] **Step 3: Commit**

```bash
git add e2e/reading.spec.ts
git commit -m "test: e2e for lesson summary card"
```

---

## Self-Review Notes

- **Spec coverage:** words metric → Task 1 (`learnedCharCount`, unique CJK); progress bar → Task 5 stats + Task 4 render; characters learned + "+N" → Tasks 1/5/4; streak → Task 5 (`currentStreak`) + Task 4; encouraging message + stars → Tasks 2/4; overlay + child dismissal → Task 4 (`onNext`/`onHome`, no auto-nav) + Task 5; animation → Task 3; a11y → Task 4; tests → Tasks 1/2/4/6.
- **Type consistency:** `LessonSummaryProps` defined in Task 4 is reused verbatim via `Omit<..., "onNext"|"onHome">` in Task 5. `learnedCharCount` / `celebrationMessage` signatures match across tasks.
- **Placeholders:** none — all steps include concrete code and commands.

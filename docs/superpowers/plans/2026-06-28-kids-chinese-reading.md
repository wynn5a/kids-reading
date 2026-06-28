# Kids Chinese Reading Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a Grade 1 Chinese textbook PDF into sequential daily reading tasks with pinyin above each character, a mark-as-read flow with sequential unlock, and a Home dashboard showing progress.

**Architecture:** An offline Python script decodes the PDF's pinyin font-cipher into a static `src/data/lessons.json`. The Next.js app statically renders lesson content and tracks all progress client-side in localStorage. Pure progress logic is isolated from React/storage for testability.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5 (strict), Tailwind CSS v4, pnpm. Pipeline: Python 3 + PyMuPDF + pypinyin. Tests: Vitest + Testing Library (jsdom) for TS unit/component, pytest for the Python pipeline, **Playwright for real-browser integration/E2E** (Tasks 7 & 9).

## Execution Protocol (subagent-driven, per-task review gate)

Every task is executed by a **fresh implementer subagent**, then verified by a **separate reviewer subagent** before the next task starts. No task is considered done until its reviewer passes.

1. **Implementer subagent** — given the single task, implements its steps (TDD), runs that task's own tests to green, and commits.
2. **Reviewer subagent** (different agent, fresh context) — receives the task spec + the diff and MUST:
   - **Re-run the task's tests itself** and paste real output (do not trust the implementer's claim):
     - Vitest tasks: `pnpm test <file>` → all pass.
     - Python task: `.pdfvenv/bin/pytest scripts/test_extract_lessons.py -v` → all pass.
     - Playwright tasks: `pnpm test:e2e <spec>` → all pass.
     - Build-touching tasks (7, 9): `pnpm build` succeeds.
   - **Code-review** against the task's Files/Interfaces and the Global Constraints (correctness, types match neighboring tasks, no scope creep, follows existing patterns).
   - Return a verdict: **PASS** (with pasted test output) or **CHANGES NEEDED** (specific, actionable). On CHANGES NEEDED, the implementer fixes and the reviewer re-checks.
3. Only after a PASS does the orchestrator proceed to (or unblock) the next task.

Tests are evidence: a reviewer claiming PASS without pasted command output is itself a CHANGES-NEEDED condition.

## Global Constraints

- No backend, no auth, no network at runtime — content is a committed static JSON; progress lives only in `localStorage`.
- Content scope: **课文 reading passages only** (no 拼音 lessons / 识字 lists / 语文园地 / 口语交际).
- Pinyin source: **decode the textbook's own pinyin** (authoritative); a library is used only to *learn* the cipher, never to choose readings.
- localStorage key is exactly `kids-reading:progress:v1`.
- Lesson `id` (1..N) is the single source of truth for reading order and unlock order.
- Sequential unlock, no day-gating: lesson `id` is unlocked iff `id === 1` or `id-1` is read.
- Path alias `@/*` maps to `src/*`. Reuse existing design-system components in `src/components/ui`.
- Dates are local-time `YYYY-MM-DD` strings, computed client-side.

---

## File Structure

```
scripts/
  requirements.txt              # pymupdf, pypinyin, pytest
  extract_lessons.py            # offline: PDF -> lessons.json (cipher auto-derive + decode)
  test_extract_lessons.py       # pytest: alignment/decode unit tests
  README.md                     # how to run the pipeline
src/
  data/
    types.ts                    # Token, Lesson
    lessons.json                # generated content (committed)
    lessons.ts                  # typed import + getAllLessons/getLesson
  lib/
    progress.ts                 # PURE: unlock/next/completion/streak/heatmap/markRead + date helpers
    progress.test.ts            # vitest unit tests
    use-progress.ts             # client hook: localStorage I/O over progress.ts
    use-progress.test.ts        # vitest (jsdom)
  components/
    reading/
      RubyText.tsx              # Token[][] -> <ruby>/<rt>
      RubyText.test.tsx
      MarkReadControls.tsx      # client: mark-as-read + lock guard
    home/
      CompletionBar.tsx
      StreakBadge.tsx
      ActivityHeatmap.tsx
      ContinueCard.tsx
      LessonGrid.tsx
      LessonGrid.test.tsx
      Dashboard.tsx             # client orchestrator: useProgress + compose home pieces
  app/
    layout.tsx                  # MODIFY: add CJK font fallback
    globals.css                 # MODIFY: ruby + CJK styling
    page.tsx                    # REPLACE marketing content with Home
    lesson/[id]/page.tsx        # reading screen (server content + client controls)
vitest.config.ts                # alias + jsdom env
vitest.setup.ts                 # jest-dom matchers
playwright.config.ts            # E2E config (webServer: pnpm dev)
e2e/
  reading.spec.ts               # Task 7: reading flow (pinyin, mark-read, unlock, lock-guard)
  home.spec.ts                  # Task 9: home dashboard + full read-through flow
```

---

### Task 1: Test tooling + Python pipeline deps

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`, `scripts/requirements.txt`, `scripts/README.md`
- Modify: `package.json` (add `test`/`test:e2e` scripts + dev deps), `.gitignore` (Playwright artifacts), `src/app/layout.tsx`, `src/app/globals.css`

**Interfaces:**
- Produces: a working `pnpm test` (Vitest, jsdom, `@/*` alias, jest-dom matchers, scoped to `src/`); a working `pnpm test:e2e` (Playwright, auto-starts dev server); a documented Python env for the pipeline; global CJK + ruby styling.

- [ ] **Step 1: Install TS test + E2E deps**

Run:
```bash
pnpm add -D vitest@^2 jsdom @testing-library/react @testing-library/jest-dom @vitejs/plugin-react @playwright/test
pnpm exec playwright install chromium
```
Expected: deps added to `package.json` devDependencies; Chromium browser downloaded.

- [ ] **Step 2: Create `vitest.config.ts`**

Vitest is scoped to `src/` so it never picks up Playwright's `e2e/*.spec.ts` files.
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add scripts to `package.json`**

In the `"scripts"` block add:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Step 5: Create `playwright.config.ts`**

Playwright auto-starts the Next dev server and runs specs from `e2e/`. Each test gets a fresh browser context (clean `localStorage`), which is exactly what the unlock/progress flows need.
```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```
Then append Playwright artifacts to `.gitignore`:
```
/test-results/
/playwright-report/
/.playwright/
```

- [ ] **Step 6: Sanity test that both runners work**

Create a throwaway `src/lib/_smoke.test.ts`:
```ts
import { test, expect } from "vitest";
test("tooling works", () => { expect(1 + 1).toBe(2); });
```
Run: `pnpm test`
Expected: PASS. Then delete `src/lib/_smoke.test.ts`.

Create a throwaway `e2e/_smoke.spec.ts`:
```ts
import { test, expect } from "@playwright/test";
test("dev server boots", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});
```
Run: `pnpm test:e2e _smoke`
Expected: PASS (Playwright boots `pnpm dev` and loads `/`). Then delete `e2e/_smoke.spec.ts`.

- [ ] **Step 7: Add CJK font fallback + ruby styling**

In `src/app/globals.css`, append:
```css
:root {
  --font-cjk: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
}
ruby { ruby-position: over; }
rt {
  font-size: 0.4em;
  color: #737373;
  font-weight: 400;
  letter-spacing: 0;
}
.cjk { font-family: var(--font-cjk); }
```
In `src/app/layout.tsx`, ensure `<body>` (or a wrapping element) includes the `cjk` class so Chinese glyphs use the CJK stack. (Add `className="cjk ..."` to the existing body/wrapper; keep existing classes.)

- [ ] **Step 8: Create Python pipeline deps + README**

`scripts/requirements.txt`:
```
pymupdf>=1.24
pypinyin>=0.51
pytest>=8
```
`scripts/README.md`:
```markdown
# Content pipeline

Extracts 课文 from `pdf/义务教育教科书·语文一年级上册.pdf` into `src/data/lessons.json`.

## Run
    python3 -m venv .pdfvenv
    .pdfvenv/bin/pip install -r scripts/requirements.txt
    .pdfvenv/bin/python scripts/extract_lessons.py

## Test
    .pdfvenv/bin/pytest scripts/test_extract_lessons.py -v

The script decodes the PDF's pinyin font-cipher. It uses `pypinyin` only to
*learn* the substitute-letter -> tone-marked-vowel map by alignment across many
samples; it never overrides the textbook's own readings. Any token with an
undecoded substitute character is logged and causes a non-zero exit.
```

- [ ] **Step 9: Commit**

```bash
git add vitest.config.ts vitest.setup.ts playwright.config.ts package.json pnpm-lock.yaml .gitignore src/app/globals.css src/app/layout.tsx scripts/requirements.txt scripts/README.md
git commit -m "chore: add vitest + playwright tooling, CJK/ruby styles, python pipeline deps"
```

---

### Task 2: Content pipeline — extract & decode lessons

**Files:**
- Create: `scripts/extract_lessons.py`, `scripts/test_extract_lessons.py`
- Output: `src/data/lessons.json`

**Interfaces:**
- Produces: `src/data/lessons.json` — a JSON array of `{ id:int, number:str, title:str, author?:str, lines: [[{char,pinyin}, ...], ...] }`.
- Produces (Python, tested): `derive_cipher(pairs) -> dict[str,str]` and `decode_pinyin(raw, cipher) -> str`.

**Background — cipher decode strategy:** In the extracted text each Chinese character is immediately followed by its pinyin token; tone-marked vowels appear as substitute characters (uppercase letters/symbols) while plain consonants/vowels are literal ASCII (e.g. 向→`xiSng` where `S`=`à`). We *learn* the map: for each (char, raw) pair, compute the char's tone-marked reading via pypinyin, align it against `raw`, and where `raw` has a non-`[a-z]` char and the reading has a toned vowel in the same slot, record a vote `substitute -> toned vowel`. Majority vote across all pairs yields the cipher table. We then decode every `raw` by replacing substitutes — preserving the textbook's actual tones (the substitute IS the textbook's toned vowel; pypinyin only teaches us which Unicode vowel it stands for).

- [ ] **Step 1: Write failing pytest for alignment/decode**

`scripts/test_extract_lessons.py`:
```python
from extract_lessons import derive_cipher, decode_pinyin

def test_derive_and_decode():
    # (char, raw_pinyin_with_substitutes) observed from the PDF
    pairs = [
        ("奶", "nAi"),   # nǎi  -> A = ǎ
        ("歌", "gE"),    # gē   -> E = ē
        ("妹", "mFi"),   # mèi  -> F = è
        ("手", "shGu"),  # shǒu -> G = ǒ
        ("洗", "xJ"),    # xǐ   -> J = ǐ
        ("向", "xiSng"), # xiàng-> S = à
        ("排", "pWi"),   # pái  -> W = á
    ]
    cipher = derive_cipher(pairs)
    assert cipher["A"] == "ǎ"
    assert cipher["E"] == "ē"
    assert cipher["F"] == "è"
    assert cipher["G"] == "ǒ"
    assert cipher["J"] == "ǐ"
    assert cipher["S"] == "à"
    assert cipher["W"] == "á"
    assert decode_pinyin("shGu", cipher) == "shǒu"
    assert decode_pinyin("xiSng", cipher) == "xiàng"
    # plain ascii pinyin passes through untouched
    assert decode_pinyin("de", cipher) == "de"
```

- [ ] **Step 2: Run test, verify it fails**

Run: `.pdfvenv/bin/pytest scripts/test_extract_lessons.py -v`
Expected: FAIL — `ImportError`/`ModuleNotFoundError` (functions not defined).

- [ ] **Step 3: Implement `derive_cipher` and `decode_pinyin`**

In `scripts/extract_lessons.py` (top portion):
```python
"""Extract 课文 reading passages from the Grade 1 textbook PDF into lessons.json."""
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

import fitz  # PyMuPDF
from pypinyin import pinyin, Style

PDF_PATH = Path("pdf/义务教育教科书·语文一年级上册.pdf")
OUT_PATH = Path("src/data/lessons.json")

TONED = set("āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüêɑ")

def _reading(char: str) -> str:
    """Tone-marked pinyin for a single Han character, or '' if not Han."""
    res = pinyin(char, style=Style.TONE, errors="ignore", heteronym=False)
    return res[0][0] if res and res[0] else ""

def derive_cipher(pairs):
    """Learn substitute-char -> toned-vowel map by aligning raw pinyin to pypinyin readings."""
    votes = defaultdict(Counter)
    for char, raw in pairs:
        ref = _reading(char)
        if not ref or len(ref) != len(raw):
            continue  # only align when lengths match (same letter count)
        for r_sub, r_ref in zip(raw, ref):
            if not ("a" <= r_sub <= "z") and r_ref in TONED:
                votes[r_sub][r_ref] += 1
    return {sub: counter.most_common(1)[0][0] for sub, counter in votes.items()}

def decode_pinyin(raw, cipher):
    """Replace substitute characters with their toned vowels; leave ascii untouched."""
    return "".join(cipher.get(ch, ch) for ch in raw)
```

- [ ] **Step 4: Run test, verify it passes**

Run: `.pdfvenv/bin/pytest scripts/test_extract_lessons.py -v`
Expected: PASS (both assertions). If a mapping is wrong, the alignment heuristic needs the length-match guard — confirm `_reading` returns the expected toned form.

- [ ] **Step 5: Implement extraction + grouping + emit**

Append to `scripts/extract_lessons.py`:
```python
def extract_pairs_and_lines(doc, page_range):
    """Walk pages, pairing each Han char with the following pinyin token.
    Returns (all_pairs, lines) where lines is a list of token-lists per visual line."""
    pairs = []
    lines = []
    for pno in page_range:
        page = doc[pno]
        data = page.get_text("dict")
        for block in data.get("blocks", []):
            for line in block.get("lines", []):
                spans = "".join(s["text"] for s in line.get("spans", []))
                toks = tokenize_line(spans)
                if toks:
                    lines.append(toks)
                    for t in toks:
                        if is_han(t["char"]) and t["pinyin"]:
                            pairs.append((t["char"], t["pinyin"]))
    return pairs, lines

def is_han(ch):
    return any("一" <= c <= "鿿" for c in ch)
```

Then a `tokenize_line(text)` that splits the interleaved `char pinyin char pinyin` stream into `{char, pinyin}` tokens (Han char followed by its raw-pinyin run; standalone punctuation gets `pinyin=""`), a `find_lessons(doc)` that maps lesson number/title to page ranges using the TOC + header scan, and a `main()` that:
1. derives the cipher from ALL collected pairs,
2. decodes every token's pinyin,
3. asserts no token still contains a non-ascii/uppercase substitute (else print offending tokens and `sys.exit(1)`),
4. assembles `Lesson` dicts with sequential `id`, writes `OUT_PATH` with `json.dump(..., ensure_ascii=False, indent=2)`.

```python
def main():
    doc = fitz.open(PDF_PATH)
    lessons_meta = find_lessons(doc)  # [{number,title,author,page_range}, ...] in reading order
    cipher = build_cipher_from_doc(doc, lessons_meta)  # derive_cipher over all pairs
    out = []
    gaps = []
    for i, meta in enumerate(lessons_meta, start=1):
        _, raw_lines = extract_pairs_and_lines(doc, meta["page_range"])
        lines = []
        for toks in raw_lines:
            decoded = [{"char": t["char"], "pinyin": decode_pinyin(t["pinyin"], cipher)} for t in toks]
            for t in decoded:
                if any(("A" <= c <= "Z") for c in t["pinyin"]):
                    gaps.append((meta["title"], t))
            lines.append(decoded)
        out.append({"id": i, "number": meta["number"], "title": meta["title"],
                    **({"author": meta["author"]} if meta.get("author") else {}),
                    "lines": lines})
    if gaps:
        print("DECODE GAPS:", gaps[:20], file=sys.stderr)
        sys.exit(1)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(out)} lessons to {OUT_PATH}")

if __name__ == "__main__":
    main()
```
Implement `tokenize_line`, `find_lessons`, and `build_cipher_from_doc` concretely against the real PDF, iterating until `main()` exits 0. Use the TOC pages (~4–5) for lesson numbers/titles and the per-page header (e.g. a leading "5 影子") to locate page ranges; filter to 课文 only.

- [ ] **Step 6: Run the pipeline end-to-end**

Run: `.pdfvenv/bin/python scripts/extract_lessons.py`
Expected: `Wrote N lessons to src/data/lessons.json` and exit 0 (no decode gaps).

- [ ] **Step 7: Manually spot-check decoded output**

Open `src/data/lessons.json`; verify against the rendered PDF for 2–3 lessons (e.g. 咏鹅, 小小的船): titles correct, line breaks sensible, pinyin tone marks correct, 轻声 like `的 de`/`么 me` present, punctuation has empty pinyin. Fix `tokenize_line`/`find_lessons` and re-run if wrong.

- [ ] **Step 8: Commit**

```bash
git add scripts/extract_lessons.py scripts/test_extract_lessons.py src/data/lessons.json
git commit -m "feat: extract and decode 课文 lessons from textbook PDF"
```

---

### Task 3: Typed data access

**Files:**
- Create: `src/data/types.ts`, `src/data/lessons.ts`, `src/data/lessons.test.ts`

**Interfaces:**
- Produces: `Token`, `Lesson` types; `getAllLessons(): Lesson[]`; `getLesson(id: number): Lesson | undefined`.

- [ ] **Step 1: Create types**

`src/data/types.ts`:
```ts
export type Token = { char: string; pinyin: string };
export type Lesson = {
  id: number;
  number: string;
  title: string;
  author?: string;
  lines: Token[][];
};
```

- [ ] **Step 2: Write failing test**

`src/data/lessons.test.ts`:
```ts
import { test, expect } from "vitest";
import { getAllLessons, getLesson } from "@/data/lessons";

test("lessons load with sequential ids and valid shape", () => {
  const lessons = getAllLessons();
  expect(lessons.length).toBeGreaterThan(0);
  lessons.forEach((l, i) => {
    expect(l.id).toBe(i + 1);
    expect(typeof l.title).toBe("string");
    expect(Array.isArray(l.lines)).toBe(true);
  });
});

test("getLesson returns by id", () => {
  expect(getLesson(1)?.id).toBe(1);
  expect(getLesson(99999)).toBeUndefined();
});

test("no residual cipher substitutes in pinyin", () => {
  for (const l of getAllLessons())
    for (const line of l.lines)
      for (const t of line)
        expect(/[A-Z]/.test(t.pinyin)).toBe(false);
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `pnpm test src/data/lessons.test.ts`
Expected: FAIL — cannot resolve `@/data/lessons`.

- [ ] **Step 4: Implement data access**

`src/data/lessons.ts`:
```ts
import data from "./lessons.json";
import type { Lesson } from "./types";

const lessons = data as Lesson[];

export function getAllLessons(): Lesson[] {
  return lessons;
}

export function getLesson(id: number): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}
```
Ensure `tsconfig.json` has `"resolveJsonModule": true` (Next.js default; add it if missing).

- [ ] **Step 5: Run test, verify it passes**

Run: `pnpm test src/data/lessons.test.ts`
Expected: PASS (all three tests).

- [ ] **Step 6: Commit**

```bash
git add src/data/types.ts src/data/lessons.ts src/data/lessons.test.ts tsconfig.json
git commit -m "feat: typed lesson data access"
```

---

### Task 4: Pure progress logic

**Files:**
- Create: `src/lib/progress.ts`, `src/lib/progress.test.ts`

**Interfaces:**
- Produces:
  - `type Progress = { readLessonIds: number[]; activity: Record<string, number> }`
  - `EMPTY_PROGRESS: Progress`
  - `isUnlocked(id: number, readLessonIds: number[]): boolean`
  - `nextLessonId(lessons: Lesson[], readLessonIds: number[]): number | null`
  - `completion(lessons: Lesson[], readLessonIds: number[]): { done: number; total: number; pct: number }`
  - `markRead(progress: Progress, id: number, todayISO: string): Progress`
  - `currentStreak(activity: Record<string, number>, todayISO: string): number`
  - `type HeatCell = { date: string; count: number }`
  - `heatmapCells(activity: Record<string, number>, todayISO: string, days?: number): HeatCell[]`
  - `toISO(d: Date): string`, `fromISO(iso: string): Date`, `todayISO(): string`

- [ ] **Step 1: Write failing tests**

`src/lib/progress.test.ts`:
```ts
import { test, expect } from "vitest";
import {
  EMPTY_PROGRESS, isUnlocked, nextLessonId, completion, markRead,
  currentStreak, heatmapCells, toISO, fromISO,
} from "@/lib/progress";
import type { Lesson } from "@/data/types";

const lessons: Lesson[] = [1, 2, 3].map((id) => ({
  id, number: String(id), title: `L${id}`, lines: [],
}));

test("unlock is sequential", () => {
  expect(isUnlocked(1, [])).toBe(true);
  expect(isUnlocked(2, [])).toBe(false);
  expect(isUnlocked(2, [1])).toBe(true);
});

test("nextLessonId returns first unlocked unread", () => {
  expect(nextLessonId(lessons, [])).toBe(1);
  expect(nextLessonId(lessons, [1])).toBe(2);
  expect(nextLessonId(lessons, [1, 2, 3])).toBeNull();
});

test("completion counts and percentage", () => {
  expect(completion(lessons, [])).toEqual({ done: 0, total: 3, pct: 0 });
  expect(completion(lessons, [1, 2])).toEqual({ done: 2, total: 3, pct: 67 });
});

test("markRead is immutable and idempotent for ids, bumps activity", () => {
  const p1 = markRead(EMPTY_PROGRESS, 1, "2026-06-28");
  expect(p1.readLessonIds).toEqual([1]);
  expect(p1.activity["2026-06-28"]).toBe(1);
  expect(EMPTY_PROGRESS.readLessonIds).toEqual([]); // original untouched
  const p2 = markRead(p1, 1, "2026-06-28");
  expect(p2.readLessonIds).toEqual([1]); // no dupe
  expect(p2.activity["2026-06-28"]).toBe(2);
});

test("currentStreak counts consecutive days ending today/yesterday", () => {
  expect(currentStreak({ "2026-06-28": 1, "2026-06-27": 1, "2026-06-26": 1 }, "2026-06-28")).toBe(3);
  expect(currentStreak({ "2026-06-27": 1 }, "2026-06-28")).toBe(1); // yesterday still counts
  expect(currentStreak({ "2026-06-26": 1 }, "2026-06-28")).toBe(0); // gap -> broken
  expect(currentStreak({}, "2026-06-28")).toBe(0);
});

test("heatmapCells returns `days` cells ending today, oldest first", () => {
  const cells = heatmapCells({ "2026-06-28": 2 }, "2026-06-28", 7);
  expect(cells).toHaveLength(7);
  expect(cells[6]).toEqual({ date: "2026-06-28", count: 2 });
  expect(cells[0].count).toBe(0);
});

test("date helpers round-trip local dates", () => {
  expect(toISO(fromISO("2026-06-28"))).toBe("2026-06-28");
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pnpm test src/lib/progress.test.ts`
Expected: FAIL — cannot resolve `@/lib/progress`.

- [ ] **Step 3: Implement `progress.ts`**

`src/lib/progress.ts`:
```ts
import type { Lesson } from "@/data/types";

export type Progress = { readLessonIds: number[]; activity: Record<string, number> };
export const EMPTY_PROGRESS: Progress = { readLessonIds: [], activity: {} };

export function isUnlocked(id: number, readLessonIds: number[]): boolean {
  return id === 1 || readLessonIds.includes(id - 1);
}

export function nextLessonId(lessons: Lesson[], readLessonIds: number[]): number | null {
  for (const l of lessons) {
    if (isUnlocked(l.id, readLessonIds) && !readLessonIds.includes(l.id)) return l.id;
  }
  return null;
}

export function completion(lessons: Lesson[], readLessonIds: number[]) {
  const total = lessons.length;
  const done = lessons.filter((l) => readLessonIds.includes(l.id)).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

export function markRead(progress: Progress, id: number, today: string): Progress {
  const readLessonIds = progress.readLessonIds.includes(id)
    ? progress.readLessonIds
    : [...progress.readLessonIds, id];
  const activity = { ...progress.activity, [today]: (progress.activity[today] ?? 0) + 1 };
  return { readLessonIds, activity };
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function currentStreak(activity: Record<string, number>, today: string): number {
  const has = (d: Date) => (activity[toISO(d)] ?? 0) > 0;
  const cursor = fromISO(today);
  if (!has(cursor)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!has(cursor)) return 0; // neither today nor yesterday
  }
  let streak = 0;
  while (has(cursor)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export type HeatCell = { date: string; count: number };

export function heatmapCells(
  activity: Record<string, number>,
  today: string,
  days = 90,
): HeatCell[] {
  const cells: HeatCell[] = [];
  const end = fromISO(today);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const iso = toISO(d);
    cells.push({ date: iso, count: activity[iso] ?? 0 });
  }
  return cells;
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `pnpm test src/lib/progress.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/progress.ts src/lib/progress.test.ts
git commit -m "feat: pure progress logic (unlock, streak, heatmap, completion)"
```

---

### Task 5: localStorage progress hook

**Files:**
- Create: `src/lib/use-progress.ts`, `src/lib/use-progress.test.ts`

**Interfaces:**
- Consumes: `Progress`, `EMPTY_PROGRESS`, `markRead`, `todayISO` from `@/lib/progress`.
- Produces: `useProgress(): { progress: Progress; loaded: boolean; markRead: (id: number) => void }` backed by `localStorage["kids-reading:progress:v1"]`.

- [ ] **Step 1: Write failing test**

`src/lib/use-progress.test.ts`:
```ts
import { test, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProgress } from "@/lib/use-progress";

const KEY = "kids-reading:progress:v1";
beforeEach(() => localStorage.clear());

test("loads empty then persists markRead", async () => {
  const { result } = renderHook(() => useProgress());
  await waitFor(() => expect(result.current.loaded).toBe(true));
  expect(result.current.progress.readLessonIds).toEqual([]);

  act(() => result.current.markRead(1));
  await waitFor(() =>
    expect(result.current.progress.readLessonIds).toEqual([1]),
  );
  const stored = JSON.parse(localStorage.getItem(KEY)!);
  expect(stored.readLessonIds).toEqual([1]);
});

test("recovers from corrupt storage", async () => {
  localStorage.setItem(KEY, "not json");
  const { result } = renderHook(() => useProgress());
  await waitFor(() => expect(result.current.loaded).toBe(true));
  expect(result.current.progress.readLessonIds).toEqual([]);
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test src/lib/use-progress.test.ts`
Expected: FAIL — cannot resolve `@/lib/use-progress`.

- [ ] **Step 3: Implement the hook**

`src/lib/use-progress.ts`:
```ts
"use client";
import { useCallback, useEffect, useState } from "react";
import { EMPTY_PROGRESS, markRead as markReadPure, todayISO, type Progress } from "@/lib/progress";

const KEY = "kids-reading:progress:v1";

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_PROGRESS;
    const p = JSON.parse(raw);
    if (!Array.isArray(p?.readLessonIds) || typeof p?.activity !== "object" || p.activity === null) {
      return EMPTY_PROGRESS;
    }
    return { readLessonIds: p.readLessonIds, activity: p.activity };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProgress(load());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(progress));
  }, [progress, loaded]);

  const markRead = useCallback((id: number) => {
    setProgress((p) => markReadPure(p, id, todayISO()));
  }, []);

  return { progress, loaded, markRead };
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test src/lib/use-progress.test.ts`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/use-progress.ts src/lib/use-progress.test.ts
git commit -m "feat: localStorage-backed useProgress hook"
```

---

### Task 6: RubyText component

**Files:**
- Create: `src/components/reading/RubyText.tsx`, `src/components/reading/RubyText.test.tsx`

**Interfaces:**
- Consumes: `Token` from `@/data/types`.
- Produces: `RubyText({ lines: Token[][] })` — renders each line as a paragraph; each token with pinyin as `<ruby>{char}<rt>{pinyin}</rt></ruby>`, punctuation (empty pinyin) as plain text.

- [ ] **Step 1: Write failing test**

`src/components/reading/RubyText.test.tsx`:
```tsx
import { test, expect } from "vitest";
import { render } from "@testing-library/react";
import { RubyText } from "@/components/reading/RubyText";

test("renders an <rt> per pinyin token and skips punctuation", () => {
  const { container } = render(
    <RubyText lines={[[
      { char: "我", pinyin: "wǒ" },
      { char: "们", pinyin: "men" },
      { char: "，", pinyin: "" },
    ]]} />,
  );
  expect(container.querySelectorAll("rt")).toHaveLength(2);
  expect(container.querySelectorAll("ruby")).toHaveLength(2);
  expect(container.textContent).toContain("，");
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test src/components/reading/RubyText.test.tsx`
Expected: FAIL — cannot resolve `RubyText`.

- [ ] **Step 3: Implement the component**

`src/components/reading/RubyText.tsx`:
```tsx
import type { Token } from "@/data/types";

export function RubyText({ lines }: { lines: Token[][] }) {
  return (
    <div className="cjk space-y-6">
      {lines.map((line, i) => (
        <p key={i} className="flex flex-wrap items-end gap-x-1 gap-y-4 text-4xl leading-loose">
          {line.map((t, j) =>
            t.pinyin ? (
              <ruby key={j} className="mx-0.5">
                {t.char}
                <rt>{t.pinyin}</rt>
              </ruby>
            ) : (
              <span key={j}>{t.char}</span>
            ),
          )}
        </p>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test src/components/reading/RubyText.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/reading/RubyText.tsx src/components/reading/RubyText.test.tsx
git commit -m "feat: RubyText component for pinyin-over-character rendering"
```

---

### Task 7: Reading screen `/lesson/[id]`

**Files:**
- Create: `src/app/lesson/[id]/page.tsx`, `src/components/reading/MarkReadControls.tsx`, `e2e/reading.spec.ts`

**Interfaces:**
- Consumes: `getAllLessons`, `getLesson`; `RubyText`; `useProgress`, `isUnlocked` from `@/lib/progress`; `Button`.
- Produces: a statically-generated reading route; `MarkReadControls({ id, nextId })` client component; Playwright coverage of the reading/unlock flow.

- [ ] **Step 1: Create the client controls (mark-as-read + lock guard)**

`src/components/reading/MarkReadControls.tsx`:
```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useProgress } from "@/lib/use-progress";
import { isUnlocked } from "@/lib/progress";

export function MarkReadControls({ id, nextId }: { id: number; nextId: number | null }) {
  const router = useRouter();
  const { progress, loaded, markRead } = useProgress();

  useEffect(() => {
    if (loaded && !isUnlocked(id, progress.readLessonIds)) {
      router.replace("/");
    }
  }, [loaded, id, progress.readLessonIds, router]);

  if (!loaded) return null;

  const alreadyRead = progress.readLessonIds.includes(id);
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={() => {
          markRead(id);
          router.push(nextId ? `/lesson/${nextId}` : "/");
        }}
      >
        {alreadyRead ? "再读一遍并继续" : "读完了"}
      </Button>
      <Button variant="secondary" onClick={() => router.push("/")}>
        返回首页
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create the reading page (server component)**

`src/app/lesson/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getAllLessons, getLesson } from "@/data/lessons";
import { RubyText } from "@/components/reading/RubyText";
import { MarkReadControls } from "@/components/reading/MarkReadControls";

export function generateStaticParams() {
  return getAllLessons().map((l) => ({ id: String(l.id) }));
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lessonId = Number(id);
  const lesson = getLesson(lessonId);
  if (!lesson) notFound();

  const nextId = getLesson(lessonId + 1) ? lessonId + 1 : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm text-neutral-500">课文 {lesson.number}</p>
      <h1 className="cjk mt-1 text-3xl font-bold">{lesson.title}</h1>
      {lesson.author && <p className="cjk mt-1 text-neutral-600">{lesson.author}</p>}

      <article className="mt-10">
        <RubyText lines={lesson.lines} />
      </article>

      <div className="mt-12">
        <MarkReadControls id={lessonId} nextId={nextId} />
      </div>
    </main>
  );
}
```
Note: lock state lives in `localStorage`, so the guard is client-side (`MarkReadControls`). Content is not secret; a briefly-visible locked passage before redirect is acceptable.

- [ ] **Step 3: Verify build + types**

Run: `pnpm build`
Expected: build succeeds; `/lesson/[id]` listed as statically generated (SSG) with one entry per lesson.

- [ ] **Step 4: Manual smoke**

Run: `pnpm dev`, open `/lesson/1`. Expected: title, author (if any), passage with pinyin above characters, two buttons. Click 读完了 → routes to `/lesson/2`. Open `/lesson/3` directly with empty progress → redirects to `/`. Open `/lesson/99999` → 404.

- [ ] **Step 5: Write Playwright integration test for the reading flow**

`e2e/reading.spec.ts` — each test runs in a fresh context (empty `localStorage`), so only lesson 1 starts unlocked.
```ts
import { test, expect } from "@playwright/test";

test("lesson 1 shows pinyin above characters", async ({ page }) => {
  await page.goto("/lesson/1");
  // ruby <rt> elements carry the pinyin
  await expect(page.locator("rt").first()).toBeVisible();
  expect(await page.locator("rt").count()).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "读完了" })).toBeVisible();
});

test("marking read advances to lesson 2", async ({ page }) => {
  await page.goto("/lesson/1");
  await page.getByRole("button", { name: "读完了" }).click();
  await expect(page).toHaveURL(/\/lesson\/2$/);
});

test("a locked lesson redirects home", async ({ page }) => {
  await page.goto("/lesson/3"); // id-2 not read in a fresh context
  await expect(page).toHaveURL("/");
});

test("an invalid lesson id 404s", async ({ page }) => {
  const res = await page.goto("/lesson/99999");
  expect(res?.status()).toBe(404);
});
```

- [ ] **Step 6: Run the integration test, verify it passes**

Run: `pnpm test:e2e reading`
Expected: all 4 tests PASS (Playwright auto-starts `pnpm dev`). If the locked-redirect test flakes, confirm `MarkReadControls` waits for `loaded` before deciding (it must not redirect during the initial empty state on an unlocked lesson).

- [ ] **Step 7: Commit**

```bash
git add src/app/lesson src/components/reading/MarkReadControls.tsx e2e/reading.spec.ts
git commit -m "feat: reading screen with mark-as-read, unlock guard, and e2e coverage"
```

---

### Task 8: Home presentational components

**Files:**
- Create: `src/components/home/CompletionBar.tsx`, `src/components/home/StreakBadge.tsx`, `src/components/home/ActivityHeatmap.tsx`, `src/components/home/ContinueCard.tsx`, `src/components/home/LessonGrid.tsx`, `src/components/home/LessonGrid.test.tsx`

**Interfaces:**
- Consumes: `Lesson`, `HeatCell`, `isUnlocked`.
- Produces (all pure, props-only):
  - `CompletionBar({ done, total, pct })`
  - `StreakBadge({ streak })`
  - `ActivityHeatmap({ cells })` where `cells: HeatCell[]`
  - `ContinueCard({ lesson })` where `lesson: Lesson | null`
  - `LessonGrid({ lessons, readLessonIds })`

- [ ] **Step 1: Write failing test for LessonGrid lock/read states**

`src/components/home/LessonGrid.test.tsx`:
```tsx
import { test, expect } from "vitest";
import { render } from "@testing-library/react";
import { LessonGrid } from "@/components/home/LessonGrid";
import type { Lesson } from "@/data/types";

const lessons: Lesson[] = [1, 2, 3].map((id) => ({
  id, number: String(id), title: `L${id}`, lines: [],
}));

test("renders read links, an unlocked link, and a disabled locked item", () => {
  const { container, getByText } = render(
    <LessonGrid lessons={lessons} readLessonIds={[1]} />,
  );
  // lesson 1 read + lesson 2 unlocked => 2 anchors; lesson 3 locked => not an anchor
  expect(container.querySelectorAll("a")).toHaveLength(2);
  expect(getByText("L3").closest("a")).toBeNull();
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test src/components/home/LessonGrid.test.tsx`
Expected: FAIL — cannot resolve `LessonGrid`.

- [ ] **Step 3: Implement the five components**

`src/components/home/CompletionBar.tsx`:
```tsx
export function CompletionBar({ done, total, pct }: { done: number; total: number; pct: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-neutral-500">阅读进度</span>
        <span className="cjk text-sm font-medium">读完 {done} / {total}</span>
      </div>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-pill bg-surface-soft">
        <div className="h-full rounded-pill bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

`src/components/home/StreakBadge.tsx`:
```tsx
export function StreakBadge({ streak }: { streak: number }) {
  return (
    <div className="cjk inline-flex items-center gap-2 rounded-pill bg-block-lime px-4 py-2">
      <span className="text-xl">🔥</span>
      <span className="font-medium">连续 {streak} 天</span>
    </div>
  );
}
```

`src/components/home/ActivityHeatmap.tsx`:
```tsx
import type { HeatCell } from "@/lib/progress";

function shade(count: number): string {
  if (count <= 0) return "bg-surface-soft";
  if (count === 1) return "bg-block-mint";
  if (count === 2) return "bg-block-lime";
  return "bg-primary";
}

export function ActivityHeatmap({ cells }: { cells: HeatCell[] }) {
  return (
    <div className="cjk">
      <p className="text-sm text-neutral-500">最近活动</p>
      <div className="mt-2 grid grid-flow-col grid-rows-7 gap-1">
        {cells.map((c) => (
          <div key={c.date} title={`${c.date}: ${c.count}`} className={`h-3 w-3 rounded-sm ${shade(c.count)}`} />
        ))}
      </div>
    </div>
  );
}
```

`src/components/home/ContinueCard.tsx`:
```tsx
import Link from "next/link";
import type { Lesson } from "@/data/types";
import { Button } from "@/components/ui";

export function ContinueCard({ lesson }: { lesson: Lesson | null }) {
  if (!lesson) {
    return (
      <div className="cjk rounded-2xl bg-block-cream p-6">
        <p className="text-lg font-medium">全部读完啦！🎉</p>
        <p className="mt-1 text-neutral-600">你已经读完了所有课文。</p>
      </div>
    );
  }
  return (
    <div className="cjk flex items-center justify-between rounded-2xl bg-block-lilac p-6">
      <div>
        <p className="text-sm text-neutral-700">继续阅读</p>
        <p className="mt-1 text-xl font-bold">课文 {lesson.number} {lesson.title}</p>
      </div>
      <Link href={`/lesson/${lesson.id}`}>
        <Button>开始</Button>
      </Link>
    </div>
  );
}
```

`src/components/home/LessonGrid.tsx`:
```tsx
import Link from "next/link";
import type { Lesson } from "@/data/types";
import { isUnlocked } from "@/lib/progress";

export function LessonGrid({ lessons, readLessonIds }: { lessons: Lesson[]; readLessonIds: number[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {lessons.map((l) => {
        const read = readLessonIds.includes(l.id);
        const unlocked = isUnlocked(l.id, readLessonIds);
        const inner = (
          <div
            className={`cjk flex h-24 flex-col justify-between rounded-2xl p-4 ${
              read ? "bg-block-mint" : unlocked ? "bg-surface-soft" : "bg-surface-soft opacity-40"
            }`}
          >
            <span className="text-xs text-neutral-500">课文 {l.number}</span>
            <span className="text-lg font-medium">
              {l.title} {read ? "✓" : unlocked ? "" : "🔒"}
            </span>
          </div>
        );
        return unlocked ? (
          <Link key={l.id} href={`/lesson/${l.id}`}>{inner}</Link>
        ) : (
          <div key={l.id} aria-disabled>{inner}</div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test src/components/home/LessonGrid.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/home
git commit -m "feat: home dashboard presentational components"
```

---

### Task 9: Dashboard orchestrator + Home page

**Files:**
- Create: `src/components/home/Dashboard.tsx`, `e2e/home.spec.ts`
- Modify (replace marketing content): `src/app/page.tsx`

**Interfaces:**
- Consumes: `useProgress`; `completion`, `nextLessonId`, `currentStreak`, `heatmapCells`, `todayISO`; all `home/*` components; `getAllLessons`, `getLesson`.
- Produces: `Dashboard({ lessons })` client component; a Home page composing it.

- [ ] **Step 1: Implement the client Dashboard**

`src/components/home/Dashboard.tsx`:
```tsx
"use client";
import type { Lesson } from "@/data/types";
import { useProgress } from "@/lib/use-progress";
import { completion, nextLessonId, currentStreak, heatmapCells, todayISO } from "@/lib/progress";
import { CompletionBar } from "./CompletionBar";
import { StreakBadge } from "./StreakBadge";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { ContinueCard } from "./ContinueCard";
import { LessonGrid } from "./LessonGrid";

export function Dashboard({ lessons }: { lessons: Lesson[] }) {
  const { progress, loaded } = useProgress();

  if (!loaded) {
    return <div className="cjk h-64 animate-pulse rounded-2xl bg-surface-soft" aria-hidden />;
  }

  const ids = progress.readLessonIds;
  const today = todayISO();
  const { done, total, pct } = completion(lessons, ids);
  const nextId = nextLessonId(lessons, ids);
  const next = nextId ? lessons.find((l) => l.id === nextId) ?? null : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <CompletionBar done={done} total={total} pct={pct} />
        <StreakBadge streak={currentStreak(progress.activity, today)} />
      </div>
      <ContinueCard lesson={next} />
      <ActivityHeatmap cells={heatmapCells(progress.activity, today, 90)} />
      <section>
        <h2 className="cjk mb-3 text-lg font-bold">全部课文</h2>
        <LessonGrid lessons={lessons} readLessonIds={ids} />
      </section>
    </div>
  );
}
```
Note: `CompletionBar` is wide; wrap in a flex-1 container if layout needs it. The `loaded` skeleton avoids SSR/hydration mismatch since progress is client-only.

- [ ] **Step 2: Replace Home page content**

Overwrite `src/app/page.tsx`:
```tsx
import { getAllLessons } from "@/data/lessons";
import { Dashboard } from "@/components/home/Dashboard";

export default function Home() {
  const lessons = getAllLessons();
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="cjk text-3xl font-bold">拼音阅读</h1>
        <p className="cjk mt-1 text-neutral-600">一年级语文 · 每天读一课</p>
      </header>
      <Dashboard lessons={lessons} />
    </main>
  );
}
```

- [ ] **Step 3: Verify build + full test suite**

Run: `pnpm build && pnpm test`
Expected: build succeeds (`/` and `/lesson/[id]` static); all tests pass.

- [ ] **Step 4: Manual end-to-end smoke**

Run: `pnpm dev`, open `/`. Expected: completion bar at 0/N, streak 0, empty heatmap, Continue card → 课文 1, lesson grid with lesson 1 unlocked and the rest locked. Click Continue → read → 读完了 → returns/advances; back on `/` completion increments, lesson 2 now unlocked, today's heatmap cell filled, streak 1. Reload page → state persists.

- [ ] **Step 5: Write Playwright integration test for the full home flow**

`e2e/home.spec.ts` — fresh context each test (empty `localStorage`).
```ts
import { test, expect } from "@playwright/test";

test("home starts empty, reading a lesson updates progress + streak", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/读完 0 \//)).toBeVisible();
  await expect(page.getByText("继续阅读")).toBeVisible();

  // open the next-up lesson via its grid/continue link, then finish it
  await page.locator('a[href="/lesson/1"]').first().click();
  await expect(page).toHaveURL(/\/lesson\/1$/);
  await page.getByRole("button", { name: "读完了" }).click();

  // back home: completion advanced, today counted toward the streak
  await page.goto("/");
  await expect(page.getByText(/读完 1 \//)).toBeVisible();
  await expect(page.getByText("连续 1 天")).toBeVisible();
  // lesson 2 is now an unlocked link
  await expect(page.locator('a[href="/lesson/2"]')).toHaveCount(1);
});

test("progress persists across a reload", async ({ page }) => {
  await page.goto("/lesson/1");
  await page.getByRole("button", { name: "读完了" }).click();
  await page.goto("/");
  await expect(page.getByText(/读完 1 \//)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/读完 1 \//)).toBeVisible();
});
```

- [ ] **Step 6: Run the integration test, verify it passes**

Run: `pnpm test:e2e home`
Expected: both tests PASS. If `读完 1` isn't found, confirm `Dashboard` waits for `loaded` before rendering counts (the skeleton must resolve to real values after mount).

- [ ] **Step 7: Run the full suite (unit + e2e) + build**

Run: `pnpm build && pnpm test && pnpm test:e2e`
Expected: build succeeds (`/` and `/lesson/[id]` static); all Vitest and all Playwright tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/home/Dashboard.tsx src/app/page.tsx e2e/home.spec.ts
git commit -m "feat: home dashboard with progress, continue, heatmap, lesson grid + e2e"
```

---

## Self-Review Notes

- **Spec coverage:** content scope 课文-only (Task 2 `find_lessons` filter) · decode textbook pinyin (Task 2) · data model (Task 3) · ruby pinyin (Task 6) · mark-as-read + sequential unlock (Tasks 5/7) · Home completion/continue/grid/streak/heatmap (Tasks 8/9) · localStorage no-login (Task 5) · CJK font (Task 1) · key `kids-reading:progress:v1` (Tasks 5) — all mapped.
- **Defaults from spec honored:** per-lesson completion, 90-day heatmap window, offer-next-lesson after read.
- **Type consistency:** `Progress`, `HeatCell`, `Token`, `Lesson`, and all function signatures are defined in Tasks 3–4 and consumed unchanged in Tasks 5–9.
- **Test coverage:** every task ships tests — pytest (Task 2), Vitest unit/component (Tasks 3,4,5,6,8), Playwright integration (Tasks 7,9). Per the Execution Protocol, a separate reviewer subagent re-runs each task's tests (pasting real output) and code-reviews before the next task starts.
- **Risk:** Task 2 extraction is the highest-uncertainty work (PDF layout/cipher); it has its own pytest for the decode core, a build-fail-on-gap guard, and a manual spot-check step before its data is committed.

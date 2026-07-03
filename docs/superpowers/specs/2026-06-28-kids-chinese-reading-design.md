# PRD / Design — 拼音阅读 (Kids Chinese Reading Platform)

**Date:** 2026-06-28
**Status:** Approved design, pending spec review → implementation plan
**Owner:** wynn5a

---

## 1. Summary

A web platform that turns a Chinese Grade 1 textbook (《义务教育教科书·语文一年级上册》)
into a sequence of daily reading tasks. Each task presents a reading passage (课文) with
**pinyin shown above every Chinese character**. A child reads the passage and marks it as
read; completing a lesson unlocks the next one. A Home page shows reading progress at a
glance — completion, a "continue" shortcut, the full lesson list, a streak, and a
GitHub-style activity heatmap.

**No login** for the initial version — all progress is stored locally in the browser.

## 2. Goals & Non-Goals

### Goals
- Extract the 课文 reading passages from the source PDF, with the textbook's own
  authoritative pinyin, into clean structured data.
- Present each passage in a kid-friendly reading screen with ruby pinyin above each character.
- Let the reader mark a lesson as read; unlock lessons sequentially.
- Show reading progress on a Home dashboard.
- Work fully offline after load; require no account.

### Non-Goals (this version)
- No user accounts, auth, or cloud sync.
- No audio / text-to-speech.
- No toggling pinyin off, quizzes, or comprehension testing.
- No content beyond 课文 (no 拼音 lessons, 识字 char lists, 语文园地, 口语交际).
- No multi-book support (single textbook for now).

## 3. Users

- **Primary:** a young child (Grade 1 reading level) practicing reading aloud with pinyin.
- **Secondary:** a parent who sets the child up and glances at progress.

## 4. Source Content & Extraction

**Source:** `pdf/义务教育教科书·语文一年级上册.pdf` (127 pages).

**Key finding:** the PDF embeds pinyin, but tone-marked vowels are stored under a custom
font encoding that maps them to substitute Latin letters. Each Chinese character is
followed in the text stream by its pinyin token. Observed mappings (partial):

| Substitute | Real | Example (extracted → decoded) |
|---|---|---|
| `A` | `ǎ` | 奶 `nAi` → `nǎi` |
| `E` | `ē` | 歌 `gE` → `gē` |
| `F` | `è` | 妹 `mFi` → `mèi` |
| `G` | `ǒ` | 手 `shGu` → `shǒu` |
| `J` | `ǐ` | 洗 `xJ` → `xǐ` |
| `K` | `ì` | 队 `duK` → `duì` |
| `S` | `à` | 向 `xiSng` → `xiàng` |
| `W` | `á` | 排 `pWi` → `pái` |

**Decision: decode the textbook's own pinyin** (authoritative — preserves 轻声 such as
"的 de"/"么 me" and correct 多音字 readings), rather than auto-generating with a library.

**Pipeline:** a one-time **offline build script** (Python + PyMuPDF) that:
1. Identifies the 课文 pages and extracts the interleaved character/pinyin stream.
2. Decodes the substitute-letter → tone-marked-vowel table to recover real pinyin.
3. Groups tokens into lines and lessons.
4. Writes **`src/data/lessons.json`**, committed to the repo.

The app reads only this static JSON — it never parses the PDF at runtime.

**Extraction risk (must verify before trusting data):** the decode table must cover the
full set of toned vowels (ā á ǎ à / ē é ě è / ī í ǐ ì / ō ó ǒ ò / ū ú ǔ ù / ü ǘ ǚ ǜ and ¨/ê
cases). The script logs any token containing an undecoded substitute character so gaps are
caught. Decoded output is spot-checked against the rendered PDF before the data is accepted.

**Scope of content:** **课文 reading passages only** — e.g. 影子, 比尾巴, 青蛙写诗, 雨点儿,
明天要远足, 大还是小, 项链, 雪地里的小画家, 乌鸦喝水, 小蜗牛, 咏鹅, 小小的船, etc.
(~14+ lessons; exact count confirmed during extraction).

## 5. Data Model

```ts
type Token = {
  char: string;    // a single Chinese character OR punctuation
  pinyin: string;  // tone-marked pinyin; "" for punctuation
};

type Lesson = {
  id: number;        // 1..N — reading order AND unlock order
  number: string;    // textbook label, e.g. "5"
  title: string;     // e.g. "影子"
  author?: string;   // e.g. "[唐] 骆宾王"
  lines: Token[][];  // each line is an array of tokens
};
```

`lessons.json` is an ordered `Lesson[]`. `id` is the single source of truth for order
and unlocking.

## 6. Pages

### 6.1 Home `/` — progress dashboard
- **Overall completion** — `读完 7 / 14` with a progress bar/percentage.
- **Continue card** — prominent button to the next unlocked, unread lesson
  (e.g. "继续阅读：课文 8 雨点儿"). If all read, shows a completed state.
- **Lesson grid/list** — every lesson as a card with state: **read ✓ / unlocked / locked**.
  Read and unlocked cards are tappable; locked cards are disabled.
- **Streak** — current days-in-a-row reading count, derived from activity dates.
- **Activity heatmap** — GitHub-style contribution grid of reading days, **last ~3 months**.

### 6.2 Reading screen `/lesson/[id]`
- Title and author.
- The passage rendered with **ruby pinyin above each Chinese character** (`<ruby>/<rt>`).
  Punctuation renders without pinyin. Lines wrap naturally; layout is large and readable.
- **「读完了」(mark-as-read)** button. On press:
  - add `id` to `readLessonIds` (unlocking `id+1`),
  - record today's date in `activity`,
  - then offer to continue to the next lesson (or return Home if none).
- Locked lessons (id beyond the unlock frontier) are not directly reachable; navigating to
  one redirects Home.

## 7. State & Persistence (no login)

A small client-side hook backed by **localStorage** under a single key:

```ts
type Progress = {
  readLessonIds: number[];          // lessons marked read
  activity: Record<string, number>; // "YYYY-MM-DD" -> count of lessons read that day
};
```

Derived logic:
- **Unlocked(id):** `id === 1 || readLessonIds.includes(id - 1)`.
- **Streak:** longest trailing run of consecutive calendar dates ending today (or yesterday)
  present in `activity`.
- **Heatmap:** render the last ~90 days; intensity from `activity[date]`.

Persistence is read once on mount and written on each change. Marking the same lesson read
twice is idempotent for `readLessonIds`; `activity` count for the day may increment.

## 8. Design System

Reuse the existing editorial black/white + pastel-block system and components
(`Card`, `Button`, `TopNav`, `Footer`, typography in `src/components/ui`). The current
marketing content in `src/app/page.tsx` is replaced by the Home dashboard.

- **Fonts:** existing `figmaSans` covers Latin/pinyin; add a CJK fallback for Chinese glyphs
  (e.g. `"PingFang SC", "Noto Sans SC", sans-serif`).
- **Ruby:** native `<ruby>`/`<rt>`; pinyin sized for legibility above large characters.
- Pastel block colors differentiate lesson cards and section accents.

## 9. Architecture / Component Boundaries

- **`scripts/extract_lessons.py`** — offline extractor; only dependency on the PDF and
  PyMuPDF. Output: `src/data/lessons.json`. Not part of the app runtime.
- **`src/data/lessons.json`** — static content, the contract between pipeline and app.
- **`src/lib/progress.ts`** (+ a React hook, e.g. `useProgress`) — owns localStorage I/O and
  derived selectors (unlocked, streak, completion). Pure/testable derivation functions kept
  separate from the storage side-effects.
- **Home page + dashboard components** — read-only consumers of `lessons.json` + progress.
- **Reading screen + `RubyText` component** — renders `Token[][]`; presentational.

Each unit has one purpose and a clear interface; derivation logic is testable without a DOM.

## 10. Open Decisions (defaults chosen)

- Completion is **per-lesson** (mark whole lesson read at once), not per-line.
- Heatmap window: **last ~3 months**.
- After marking read, **offer the next lesson**.

## 11. Success Criteria

- `lessons.json` contains all 课文 with correctly decoded pinyin (spot-checked vs PDF).
- A reader can open lesson 1, read it with pinyin, mark it read, and see lesson 2 unlock.
- Home reflects accurate completion, next-up, lesson states, streak, and heatmap.
- Refreshing the browser preserves all progress.
- Works with no network after initial load; no login anywhere.

# 儿童中文阅读 · Kids Chinese Reading

A [Next.js](https://nextjs.org) app for kids to read Grade-1 Chinese textbook lessons with pinyin ruby text, mark lessons as read, and track their progress on a home dashboard. Lesson content is extracted from a textbook PDF into structured data.

## Features

- **Pinyin ruby text** — each character rendered with pinyin above it (`RubyText`)
- **Reading screen** — per-lesson view with mark-as-read and sequential unlock guard
- **Home dashboard** — continue card, streak badge, activity heatmap, completion bar, and lesson grid
- **Progress tracking** — sequential lesson unlocking, daily streak, and activity heatmap, persisted in `localStorage`
- **Content pipeline** — Python script extracts & decodes 课文 lessons from the textbook PDF into `src/data/lessons.json`

## Getting Started

Install dependencies and run the dev server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:watch` | Run unit tests in watch mode |
| `pnpm test:e2e` | Run end-to-end tests (Playwright) |

## Project Structure

```
src/
  app/                 # Next.js routes (home, lesson/[id])
  components/
    home/              # dashboard: continue, streak, heatmap, completion, lesson grid
    reading/           # RubyText, mark-as-read controls
    ui/                # shared UI primitives
  data/                # typed lesson data access + lessons.json
  lib/                 # pure progress logic + useProgress hook
e2e/                   # Playwright specs (home, reading)
scripts/               # Python PDF -> lessons.json extraction pipeline
docs/                  # design, architecture, and plan docs
```

## Content Pipeline

Lesson data is generated from the textbook PDF by a Python script (see [`scripts/README.md`](scripts/README.md)):

```bash
python -m venv .pdfvenv && source .pdfvenv/bin/activate
pip install -r scripts/requirements.txt
python scripts/extract_lessons.py
```

## Tech Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Vitest · Playwright

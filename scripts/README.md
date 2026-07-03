# Content pipeline

The PDF is the single source of truth for lesson text **and** pinyin:

    PDF → extract_lessons.py → src/data/lessons.json → page render (RubyText)
                                                     → gen-tts.mjs → MP3 per line

`lessons.json` and `audio-manifest.json` are generated — never hand-edit them.

## Run

One-time setup, then `pnpm gen` (or `pnpm gen:lessons` for extraction alone):

    python3 -m venv .pdfvenv
    .pdfvenv/bin/pip install -r scripts/requirements.txt
    pnpm gen

## TTS sync

`pnpm gen:tts` re-synthesizes a clip only when its MP3 is missing or its text
differs from what `audio-manifest.json` recorded (content-aware; `--force`
redoes all). The decision logic is `planClips` in `tts-plan.mjs`, unit-tested
by `tts-plan.test.mjs` (runs under `pnpm test`). Clip text uses the app's own
`lineText` from `src/data/line-text.ts` — a single definition for what a line
"says", shared by page and audio.

## Test
    .pdfvenv/bin/pytest scripts/test_extract_lessons.py -v

The script decodes the PDF's pinyin font-cipher. It uses `pypinyin` only to
*learn* the substitute-letter -> tone-marked-vowel map by alignment across many
samples; it never overrides the textbook's own readings. Any token with an
undecoded substitute character is logged and causes a non-zero exit.

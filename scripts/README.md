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

## 多音字 pronunciation hints

The TTS engine guesses 多音字 readings itself and can contradict the
textbook's pinyin (e.g. 尾巴长 read as zhǎng). MiMo has no pinyin markup;
per its usage guide the user message carries natural-language direction, so
each risky line gets a generated 发音指导 sentence appended there
(`多音字发音：「长」读“cháng”。`).

    .pdfvenv/bin/python scripts/check_tts_pinyin.py           # report
    .pdfvenv/bin/python scripts/check_tts_pinyin.py --write   # + regenerate
                                                              #   src/data/tts-pinyin-hints.json

The hints derive from the textbook pinyin in lessons.json (compared against a
pypinyin guess), so they stay in sync with the single source of truth —
`pnpm gen:lessons` runs `--write` automatically, and gen-tts regenerates any
clip whose hint changed. 一/不 sandhi and interjection tones are excluded
(engines handle those natively). `tts-overrides.json` (spoken-only rewording)
remains as a last resort if a hint isn't obeyed.

## Test
    .pdfvenv/bin/pytest scripts/test_extract_lessons.py -v

The script decodes the PDF's pinyin font-cipher. It uses `pypinyin` only to
*learn* the substitute-letter -> tone-marked-vowel map by alignment across many
samples; it never overrides the textbook's own readings. Any token with an
undecoded substitute character is logged and causes a non-zero exit.

# TTS Narration for Lessons — Design

Date: 2026-07-03

## Goal

Let young readers hear each lesson read aloud, one visual line at a time, with
correct, kid-friendly pronunciation, plus on-page play controls. Audio is
synthesized with Xiaomi MiMo `mimo-v2.5-tts`.

## Decisions (from brainstorming)

- **Generation:** pre-generate all clips at build time (not runtime). Static
  `/audio/*.mp3` files ship with the app — zero runtime key, offline, instant.
- **Reading unit:** one clip per **visual line** (`lesson.lines[i]`). Highlight
  is always a clean single line and maps 1:1 to the audio file index.
- **Voice:** `茉莉` (Jasmine) preset. Style instruction: `语速稍慢，吐字清晰，
  温柔亲切，适合读给小朋友听`.
- **Controls:** play/pause whole lesson (auto-advance + highlight), tap a line
  to play just it, replay current line, speed toggle (慢 0.75× / 正常 1×).

## Architecture

### Build-time generation
- `scripts/gen-tts.mjs`, run via `pnpm gen:tts` (dependency-free Node ≥18).
- Reads `src/data/lessons.json`. For each line, builds the line text by
  concatenating every token's `char` (keeps `。，！？` so pauses sound natural).
- Calls `POST https://api.xiaomimimo.com/v1/chat/completions`:
  ```
  headers: { "api-key": MIMO_API_KEY, "content-type": "application/json" }
  body: {
    model: "mimo-v2.5-tts",
    messages: [
      { role: "user",      content: "语速稍慢，吐字清晰，温柔亲切，适合读给小朋友听" },
      { role: "assistant", content: <line text> }
    ],
    audio: { format: "wav", voice: "茉莉" },
    stream: false
  }
  ```
- Response audio is base64 in `choices[0].message.audio.data` (parsed
  defensively). Decode → WAV → pipe through **ffmpeg** to MP3 at
  `public/audio/<lessonId>-<lineIndex>.mp3`. ffmpeg missing → clear error.
- **Idempotent:** skips lines whose MP3 already exists, so re-runs only
  synthesize new/changed/overridden clips. Prints each clip's text for
  spot-checking.
- Writes `src/data/audio-manifest.json`: `{ "<id>-<i>": { "text": string } }`
  so the app and tests know exactly which clips exist.

### Key handling
- `MIMO_API_KEY` in `.env.local` (`.env*` is gitignored — never committed, never
  in the client bundle). Script reads `process.env.MIMO_API_KEY`.

### Pronunciation correctness (safety valve)
- Optional `src/data/tts-overrides.json`: `{ "<id>-<i>": "replacement text" }`.
  When present the script synthesizes the override instead of the raw line —
  lets a maintainer fix any 多音字 misread (reword / annotate) and re-run
  `pnpm gen:tts`. Ships empty (`{}`).

### Runtime player (client)
- `src/lib/tts-player.ts`: pure `playerReducer` — state
  `{ mode: 'idle'|'all'|'single', currentLine: number, playing: boolean }` with
  actions (`playAll`, `playLine`, `pause`, `resume`, `replay`, `advance`,
  `ended`, `stop`). Extracted for unit testing without a real audio element.
- `src/lib/tts-player.ts` also exports `clipSrc(id, i)` and reuses a `lineText`
  helper (shared with the generator via `src/data/line-text.ts`).
- `LessonPlayer` (`src/components/reading/LessonPlayer.tsx`, client): owns one
  `HTMLAudioElement`, dispatches to the reducer, drives playback:
  - Play/pause whole lesson: play line 0, on `ended` advance + play next,
    highlight each; pause/resume.
  - Tap a line: single mode, plays only that line.
  - Replay: replays `currentLine`.
  - Speed: `audio.playbackRate` = 0.75 or 1 with `preservesPitch = true`
    (natural slow-down; no second clip set).
  - Renders controls in a fixed-height `shrink-0` bar between the article and
    `MarkReadControls` so `RubyText` auto-fit still measures correctly. Icons
    from `lucide-react`.
- `RubyText` gains optional props `activeLine?: number`, `onLineClick?(i)`, and
  applies a highlight class to the active `<p>`. Auto-fit logic untouched.

## Layout

`src/app/lesson/[id]/page.tsx` wraps the article + controls in `LessonPlayer`
(client) so playback state can drive both the highlight and the controls bar.
`RubyText` stays the render/auto-fit surface.

## Testing

- Unit (Vitest): `lineText(tokens)` builder; `playerReducer` transitions.
- Component: `RubyText` highlights `activeLine` and fires `onLineClick`.
- `pnpm build` passes (static params unchanged).

## Trade-offs / notes

- ~132 small MP3s committed (~10–30 KB each). Accepted per generation choice.
- Speed handled via `playbackRate`, not a second clip set — no repo doubling.
- Line clips that end on a comma are fine: the style instruction keeps delivery
  gentle rather than abruptly clipped.

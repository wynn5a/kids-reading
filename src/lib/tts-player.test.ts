import { test, expect } from "vitest";
import {
  playerReducer,
  initialPlayerState,
  activeLine,
  type PlayerState,
} from "@/lib/tts-player";
import { lineText, clipKey, clipSrc } from "@/data/line-text";

const s = (over: Partial<PlayerState> = {}): PlayerState => ({ ...initialPlayerState, ...over });

test("playAll starts at line 0 and bumps token", () => {
  const next = playerReducer(initialPlayerState, { type: "playAll" });
  expect(next).toMatchObject({ mode: "all", currentLine: 0, playing: true });
  expect(next.token).toBe(initialPlayerState.token + 1);
});

test("playLine plays a single line", () => {
  const next = playerReducer(initialPlayerState, { type: "playLine", line: 3 });
  expect(next).toMatchObject({ mode: "single", currentLine: 3, playing: true });
});

test("pause/resume toggle playing without changing the line", () => {
  const playing = s({ mode: "all", currentLine: 2, playing: true, token: 5 });
  const paused = playerReducer(playing, { type: "pause" });
  expect(paused).toMatchObject({ playing: false, currentLine: 2, token: 5 });
  const resumed = playerReducer(paused, { type: "resume" });
  expect(resumed).toMatchObject({ playing: true, currentLine: 2, token: 5 });
});

test("pause/resume are no-ops while idle", () => {
  expect(playerReducer(initialPlayerState, { type: "pause" })).toBe(initialPlayerState);
  expect(playerReducer(initialPlayerState, { type: "resume" })).toBe(initialPlayerState);
});

test("replay restarts the current line (bumps token)", () => {
  const st = s({ mode: "all", currentLine: 4, playing: false, token: 2 });
  const next = playerReducer(st, { type: "replay" });
  expect(next).toMatchObject({ mode: "all", currentLine: 4, playing: true, token: 3 });
});

test("replay from idle plays the current line as a single", () => {
  const next = playerReducer(initialPlayerState, { type: "replay" });
  expect(next).toMatchObject({ mode: "single", playing: true });
});

test("ended in 'all' advances to the next line", () => {
  const st = s({ mode: "all", currentLine: 0, playing: true, token: 1 });
  const next = playerReducer(st, { type: "ended", lineCount: 3 });
  expect(next).toMatchObject({ mode: "all", currentLine: 1, playing: true, token: 2 });
});

test("ended on the last line stops", () => {
  const st = s({ mode: "all", currentLine: 2, playing: true });
  const next = playerReducer(st, { type: "ended", lineCount: 3 });
  expect(next).toMatchObject({ mode: "idle", playing: false });
});

test("ended in 'single' stops immediately", () => {
  const st = s({ mode: "single", currentLine: 5, playing: true });
  const next = playerReducer(st, { type: "ended", lineCount: 10 });
  expect(next).toMatchObject({ mode: "idle", playing: false });
});

test("stop resets to idle at line 0", () => {
  const st = s({ mode: "all", currentLine: 7, playing: true, token: 9 });
  const next = playerReducer(st, { type: "stop" });
  expect(next).toMatchObject({ mode: "idle", currentLine: 0, playing: false });
  expect(next.token).toBe(10);
});

test("activeLine is null only while idle", () => {
  expect(activeLine(initialPlayerState)).toBeNull();
  expect(activeLine(s({ mode: "all", currentLine: 3 }))).toBe(3);
  expect(activeLine(s({ mode: "single", currentLine: 1 }))).toBe(1);
});

test("lineText joins chars including punctuation", () => {
  const line = [
    { char: "天", pinyin: "tiān" },
    { char: "气", pinyin: "qì" },
    { char: "，", pinyin: "" },
  ];
  expect(lineText(line)).toBe("天气，");
});

test("clip key and src are stable", () => {
  expect(clipKey(1, 0)).toBe("1-0");
  expect(clipSrc(12, 3)).toBe("/audio/12-3.mp3");
});

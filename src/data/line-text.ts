import type { Token } from "./types";

/**
 * The spoken/synthesizable text for one visual line: every token's character
 * joined in order, punctuation included so TTS pauses sound natural.
 */
export function lineText(line: Token[]): string {
  return line.map((t) => t.char).join("");
}

/** Stable key for a line's audio clip, e.g. "1-0". */
export function clipKey(lessonId: number, lineIndex: number): string {
  return `${lessonId}-${lineIndex}`;
}

/** Public URL of a line's pre-generated audio clip. */
export function clipSrc(lessonId: number, lineIndex: number): string {
  return `/audio/${clipKey(lessonId, lineIndex)}.mp3`;
}

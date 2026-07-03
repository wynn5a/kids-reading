import { lineText } from "../src/data/line-text.ts";

/**
 * Decide which clips to synthesize and which to keep. A clip is skipped only
 * when its MP3 already exists AND the previous manifest recorded the exact
 * same text — so any text change (re-extraction or tts-overrides edit)
 * regenerates just the affected lines.
 *
 * @param {object} p
 * @param {Array<{id: number, lines: Array<Array<{char: string, pinyin: string}>>}>} p.lessons
 * @param {Record<string, string>} p.overrides  spoken-only rewording per clip key
 * @param {Record<string, {text: string}>} p.prevManifest  previous audio-manifest.json
 * @param {(key: string) => boolean} p.hasClip  whether the MP3 for a key exists
 * @param {boolean} [p.force]  re-synthesize everything
 * @returns {Array<{key: string, text: string, action: "synth" | "skip"}>}
 */
export function planClips({ lessons, overrides, prevManifest, hasClip, force = false }) {
  const plan = [];
  for (const lesson of lessons) {
    lesson.lines.forEach((line, i) => {
      const key = `${lesson.id}-${i}`;
      const text = (overrides[key] ?? lineText(line)).trim();
      if (!text) return;
      const upToDate = !force && hasClip(key) && prevManifest[key]?.text === text;
      plan.push({ key, text, action: upToDate ? "skip" : "synth" });
    });
  }
  return plan;
}

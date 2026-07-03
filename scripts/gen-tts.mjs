#!/usr/bin/env node
/**
 * Pre-generate line-by-line TTS audio for every lesson using Xiaomi MiMo
 * (mimo-v2.5-tts). One MP3 per visual line at public/audio/<id>-<line>.mp3.
 *
 *   pnpm gen:tts            # synthesize missing/out-of-date clips
 *   pnpm gen:tts --force    # re-synthesize everything
 *
 * The text of every clip comes from lessons.json (itself generated from the
 * textbook PDF) via the same lineText the app uses; a clip is regenerated
 * whenever its text no longer matches what audio-manifest.json recorded.
 *
 * Requires MIMO_API_KEY (process.env or .env.local) and ffmpeg on PATH —
 * only when at least one clip actually needs synthesizing.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { planClips } from "./tts-plan.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUDIO_DIR = join(ROOT, "public", "audio");
const MANIFEST = join(ROOT, "src", "data", "audio-manifest.json");

const API_URL = "https://api.xiaomimimo.com/v1/chat/completions";
const MODEL = "mimo-v2.5-tts";
const VOICE = "茉莉";
const STYLE = "语速稍慢，吐字清晰，发音标准的普通话，温柔亲切，适合读给小朋友听";

const FORCE = process.argv.includes("--force");

// --- env: prefer process.env, fall back to a minimal .env.local parse --------
function loadEnvLocal() {
  if (process.env.MIMO_API_KEY) return;
  const p = join(ROOT, ".env.local");
  if (!existsSync(p)) return;
  for (const raw of readFileSync(p, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvLocal();

const API_KEY = process.env.MIMO_API_KEY;

// --- helpers -----------------------------------------------------------------
function extractBase64(json) {
  const msg = json?.choices?.[0]?.message;
  const audio = msg?.audio;
  const data = typeof audio === "string" ? audio : audio?.data;
  if (!data) throw new Error("no audio.data in response: " + JSON.stringify(json).slice(0, 300));
  return data;
}

async function synthesize(text) {
  const body = {
    model: MODEL,
    messages: [
      { role: "user", content: STYLE },
      { role: "assistant", content: text },
    ],
    audio: { format: "wav", voice: VOICE },
    stream: false,
  };
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "api-key": API_KEY, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return Buffer.from(extractBase64(await res.json()), "base64");
    } catch (err) {
      lastErr = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  throw lastErr;
}

function wavToMp3(wavBuffer, outPath) {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-loglevel", "error", "-y",
      "-f", "wav", "-i", "pipe:0",
      "-codec:a", "libmp3lame", "-qscale:a", "5",
      outPath,
    ]);
    let stderr = "";
    ff.stderr.on("data", (d) => (stderr += d));
    ff.on("error", (e) =>
      reject(new Error(e.code === "ENOENT" ? "ffmpeg not found on PATH" : String(e))),
    );
    ff.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error("ffmpeg failed: " + stderr.slice(0, 300))),
    );
    ff.stdin.on("error", () => {}); // ignore EPIPE if ffmpeg exits early
    ff.stdin.write(wavBuffer);
    ff.stdin.end();
  });
}

// --- main --------------------------------------------------------------------
const lessons = JSON.parse(readFileSync(join(ROOT, "src", "data", "lessons.json"), "utf8"));
const overrides = JSON.parse(readFileSync(join(ROOT, "src", "data", "tts-overrides.json"), "utf8"));
mkdirSync(AUDIO_DIR, { recursive: true });

// Plan the full clip list (so the manifest is complete even when clips exist);
// a clip is up to date only if its MP3 exists AND its text hasn't changed.
const prevManifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
const clips = planClips({
  lessons,
  overrides,
  prevManifest,
  hasClip: (key) => existsSync(join(AUDIO_DIR, `${key}.mp3`)),
  force: FORCE,
});

if (clips.some((c) => c.action === "synth") && !API_KEY) {
  console.error("Missing MIMO_API_KEY (set it in .env.local or the environment).");
  process.exit(1);
}

const manifest = {};
let made = 0;
let skipped = 0;
for (let n = 0; n < clips.length; n++) {
  const { key, text, action } = clips[n];
  manifest[key] = { text };
  const tag = `[${n + 1}/${clips.length}] ${key}`;
  if (action === "skip") {
    skipped++;
    console.log(`${tag} skip (up to date)  ${text}`);
    continue;
  }
  process.stdout.write(`${tag} …  ${text}\n`);
  const wav = await synthesize(text);
  await wavToMp3(wav, join(AUDIO_DIR, `${key}.mp3`));
  made++;
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

// Warn about orphaned files (e.g. after a line was removed from a lesson).
const wanted = new Set(clips.map((c) => `${c.key}.mp3`));
const orphans = readdirSync(AUDIO_DIR).filter((f) => f.endsWith(".mp3") && !wanted.has(f));
if (orphans.length) console.log(`\nOrphaned clips (safe to delete): ${orphans.join(", ")}`);

console.log(`\nDone. ${made} generated, ${skipped} skipped, ${clips.length} total. Manifest: ${MANIFEST}`);

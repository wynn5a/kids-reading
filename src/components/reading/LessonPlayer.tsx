"use client";
import { useEffect, useReducer, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Gauge } from "lucide-react";
import type { Token } from "@/data/types";
import { clipSrc } from "@/data/line-text";
import {
  playerReducer,
  initialPlayerState,
  activeLine as selectActiveLine,
} from "@/lib/tts-player";
import { RubyText } from "./RubyText";

const SLOW = 0.75;
const NORMAL = 1;

export function LessonPlayer({ id, lines }: { id: number; lines: Token[][] }) {
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);
  const [speed, setSpeed] = useState<number>(NORMAL);
  const audioRef = useRef<HTMLAudioElement>(null);

  // (Re)load and play the current clip whenever the line or the restart token
  // changes. Assigning `src` reloads from the start, so replay works too.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || state.mode === "idle") return;
    a.src = clipSrc(id, state.currentLine);
    a.playbackRate = speed;
    a.preservesPitch = true;
    if (state.playing) a.play().catch(() => {});
    // speed intentionally omitted: a speed change shouldn't restart the clip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, state.currentLine, state.token]);

  // Pause/resume in place without reloading.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (state.playing) a.play().catch(() => {});
    else a.pause();
  }, [state.playing]);

  // Live speed changes apply to the currently playing clip.
  useEffect(() => {
    const a = audioRef.current;
    if (a) a.playbackRate = speed;
  }, [speed]);

  const playing = state.playing;
  const active = selectActiveLine(state);

  const togglePlay = () => {
    if (playing) dispatch({ type: "pause" });
    else if (state.mode === "idle") dispatch({ type: "playAll" });
    else dispatch({ type: "resume" });
  };

  return (
    <>
      <article className="mt-6 min-h-0 flex-1">
        <RubyText
          lines={lines}
          activeLine={active}
          onLineClick={(i) => dispatch({ type: "playLine", line: i })}
        />
      </article>

      {/* Fixed-height control bar so RubyText's auto-fit measures a stable box. */}
      <div className="mt-4 flex h-14 shrink-0 items-center justify-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "暂停" : "播放"}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-white shadow-md transition-transform active:scale-95 hover:bg-amber-600"
        >
          {playing ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="h-6 w-6 translate-x-[1px]" fill="currentColor" />}
        </button>

        <button
          type="button"
          onClick={() => dispatch({ type: "replay" })}
          aria-label="重听这一句"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700 transition-colors active:scale-95 hover:bg-amber-200"
        >
          <RotateCcw className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setSpeed((s) => (s === NORMAL ? SLOW : NORMAL))}
          aria-label="切换语速"
          aria-pressed={speed === SLOW}
          className="flex h-11 items-center gap-1.5 rounded-full bg-amber-100 px-4 text-amber-700 transition-colors active:scale-95 hover:bg-amber-200"
        >
          <Gauge className="h-5 w-5" />
          <span className="cjk text-sm font-semibold">{speed === SLOW ? "慢速" : "正常"}</span>
        </button>
      </div>

      <audio
        ref={audioRef}
        preload="none"
        onEnded={() => dispatch({ type: "ended", lineCount: lines.length })}
        // If a clip is missing/unplayable, advance instead of stalling.
        onError={() => {
          if (state.mode !== "idle") dispatch({ type: "ended", lineCount: lines.length });
        }}
      />
    </>
  );
}

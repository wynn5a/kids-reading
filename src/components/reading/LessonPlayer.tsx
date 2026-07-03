"use client";
import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { Pause, Play, RotateCcw, Rabbit, Turtle } from "lucide-react";
import { IconButton } from "@/components/ui";
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

export function LessonPlayer({
  id,
  lines,
  actions,
}: {
  id: number;
  lines: Token[][];
  /** Lesson actions (mark-read / home) rendered on the right of the footer. */
  actions?: ReactNode;
}) {
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

      {/* One unified footer: playback cluster on the left, lesson actions on
          the right. min-height keeps the box stable so RubyText's auto-fit (and
          MarkReadControls mounting after progress loads) don't reflow it. */}
      <div className="mt-4 flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "暂停" : "播放"}
            className="flex size-12 items-center justify-center rounded-full bg-primary text-on-primary transition-transform duration-150 active:scale-95 hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            {playing ? (
              <Pause className="size-5" fill="currentColor" strokeWidth={0} />
            ) : (
              <Play className="size-5 translate-x-[1px]" fill="currentColor" strokeWidth={0} />
            )}
          </button>

          <IconButton aria-label="重听这一句" onClick={() => dispatch({ type: "replay" })}>
            <RotateCcw className="size-5" strokeWidth={1.75} />
          </IconButton>

          <button
            type="button"
            onClick={() => setSpeed((s) => (s === NORMAL ? SLOW : NORMAL))}
            aria-label="切换语速"
            aria-pressed={speed === SLOW}
            className="inline-flex h-10 items-center gap-1.5 rounded-pill bg-surface-soft px-4 text-ink transition-colors hover:bg-hairline active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            {speed === SLOW ? (
              <Turtle className="size-5" strokeWidth={1.75} />
            ) : (
              <Rabbit className="size-5" strokeWidth={1.75} />
            )}
            <span className="cjk text-sm font-semibold">{speed === SLOW ? "慢速" : "正常"}</span>
          </button>
        </div>

        {actions && <div className="flex items-center">{actions}</div>}
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

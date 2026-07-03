"use client";
import { useLayoutEffect, useRef, useState } from "react";
import type { Token } from "@/data/types";

// Character-size bounds (px) the auto-fit may pick. MAX matches the title
// (`text-3xl` = 30px) so body text is never bigger than the title. MIN is the
// absolute floor for the longest lessons.
const MIN = 8;
const MAX = 30;
// Lines stay unbroken only while the font is at least this big; below it we
// allow wrapping rather than shrink the text into unreadability.
const NOWRAP_FLOOR = 14;

export function RubyText({ lines }: { lines: Token[][] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(MAX);
  const [wrap, setWrap] = useState(false);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    if (!box || !content) return;
    const paras = () => Array.from(content.querySelectorAll("p")) as HTMLElement[];

    const fit = () => {
      // 1px safety margin so a boundary-exact fit never triggers a scrollbar.
      const availH = box.clientHeight - 1;
      if (availH <= 0) return;

      const setWrapMode = (on: boolean) =>
        paras().forEach((p) => (p.style.flexWrap = on ? "wrap" : "nowrap"));
      // Left-align while measuring: the final justify-center hides horizontal
      // overflow (it spills symmetrically), so scrollWidth would never exceed
      // clientWidth. Aligned to start, an over-wide line is measurable.
      const setMeasuring = (on: boolean) =>
        paras().forEach((p) => (p.style.justifyContent = on ? "flex-start" : ""));
      const heightFits = () => content.scrollHeight <= availH;
      // In nowrap mode a line too wide for the column overflows its own <p>.
      const linesFit = () => paras().every((p) => p.scrollWidth <= p.clientWidth + 1);
      setMeasuring(true);

      // Largest font in [MIN, MAX] whose content passes `ok`.
      const search = (ok: () => boolean) => {
        let best = MIN;
        let a = MIN;
        let b = MAX;
        for (let i = 0; i < 14; i++) {
          const mid = (a + b) / 2;
          content.style.fontSize = `${mid}px`;
          if (ok()) {
            best = mid;
            a = mid;
          } else {
            b = mid;
          }
        }
        return best;
      };

      // Prefer no wrapping: every line on one row and all rows fit vertically.
      setWrapMode(false);
      const nowrap = search(() => heightFits() && linesFit());

      let useWrap: boolean;
      let best: number;
      if (nowrap >= NOWRAP_FLOOR) {
        useWrap = false;
        best = nowrap;
      } else {
        // Keeping lines unbroken would shrink below the floor — let them wrap
        // and fit by height alone.
        setWrapMode(true);
        useWrap = true;
        best = search(heightFits);
      }

      // Verify at the final integer size and shrink until it genuinely fits
      // (guards against boundary rounding that would otherwise clip).
      let px = Math.floor(best);
      const fits = () => heightFits() && (useWrap || linesFit());
      content.style.fontSize = `${px}px`;
      while (px > MIN && !fits()) {
        px -= 1;
        content.style.fontSize = `${px}px`;
      }
      setMeasuring(false); // restore the centered alignment for display

      // Apply imperatively so both stick even when setState() is a no-op
      // (React bails on an unchanged value and would leave these cleared).
      setWrapMode(useWrap);
      setSize(px);
      setWrap(useWrap);
    };

    fit();
    // Re-fit after layout settles: web fonts load late (reflowing the text)
    // and sibling controls mount asynchronously (resizing the available box).
    const raf = requestAnimationFrame(fit);
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(fit);
      ro.observe(box);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      ro?.disconnect();
    };
  }, [lines]);

  return (
    <div ref={boxRef} className="flex h-full items-center overflow-hidden">
      <div ref={contentRef} className="cjk w-full" style={{ fontSize: size }}>
        {lines.map((line, i) => (
          <p
            key={i}
            className={`flex ${wrap ? "flex-wrap" : "flex-nowrap"} items-end justify-center gap-x-[0.06em] gap-y-[0.25em] leading-[1.9] not-first:mt-[0.3em]`}
          >
            {line.map((t, j) =>
              t.pinyin ? (
                <ruby key={j} className="mx-[0.04em]">
                  {t.char}
                  <rt>{t.pinyin}</rt>
                </ruby>
              ) : (
                <span key={j}>{t.char}</span>
              ),
            )}
          </p>
        ))}
      </div>
    </div>
  );
}

import type { Token } from "@/data/types";

export function RubyText({ lines }: { lines: Token[][] }) {
  return (
    <div className="cjk space-y-6">
      {lines.map((line, i) => (
        <p key={i} className="flex flex-wrap items-end gap-x-1 gap-y-4 text-4xl leading-loose">
          {line.map((t, j) =>
            t.pinyin ? (
              <ruby key={j} className="mx-0.5">
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
  );
}

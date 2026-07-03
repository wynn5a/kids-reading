"use client";
import { useEffect, useRef } from "react";
import { PartyPopper, Trophy, Star, Flame } from "lucide-react";
import { Card, Button } from "@/components/ui";

export type LessonSummaryProps = {
  done: number;
  total: number;
  pct: number;
  totalChars: number;
  lessonChars: number;
  streak: number;
  isLast: boolean;
  message: string;
  onNext: () => void;
  onHome: () => void;
};

export function LessonSummary({
  done,
  total,
  pct,
  totalChars,
  lessonChars,
  streak,
  isLast,
  message,
  onNext,
  onHome,
}: LessonSummaryProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onHome();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onHome]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="本课小结"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
    >
      <Card className="animate-pop-in w-full max-w-[28rem] rounded-xl p-8 text-center">
        <div className="flex justify-center">
          {isLast ? (
            <Trophy className="h-14 w-14" strokeWidth={1.5} />
          ) : (
            <PartyPopper className="h-14 w-14" strokeWidth={1.5} />
          )}
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <Star
              key={i}
              className="animate-star-joy h-7 w-7 fill-current text-[#facc15]"
              strokeWidth={1.5}
              style={{ animationDelay: `${i * 0.14}s` }}
            />
          ))}
        </div>

        <h2 className="cjk mt-5 text-2xl font-bold">{message}</h2>

        <div className="mt-8 text-left">
          <div className="flex items-baseline justify-between">
            <span className="cjk text-sm text-neutral-500">阅读进度</span>
            <span className="cjk text-sm font-medium">读完 {done} / {total}</span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-pill bg-surface-soft">
            <div className="h-full rounded-pill bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="cjk mt-8 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-block-lime px-4 py-3">
            <p className="text-sm text-neutral-600">这一课学会</p>
            <p className="mt-1 flex items-baseline justify-center gap-1">
              <span className="text-3xl font-bold">{lessonChars}</span>
              <span className="text-base">个字</span>
            </p>
          </div>
          <div className="rounded-lg bg-surface-soft px-4 py-3">
            <p className="text-sm text-neutral-600">一共认识</p>
            <p className="mt-1 flex items-baseline justify-center gap-1">
              <span className="text-3xl font-bold">{totalChars}</span>
              <span className="text-base">个字</span>
            </p>
          </div>
        </div>

        <div className="cjk mt-6 flex items-center justify-center gap-2 text-neutral-700">
          <Flame className="h-5 w-5" strokeWidth={1.5} />
          <span>连续阅读 {streak} 天</span>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {isLast ? (
            <Button ref={primaryRef} onClick={onHome}>全部读完啦</Button>
          ) : (
            <>
              <Button ref={primaryRef} onClick={onNext}>下一课</Button>
              <Button variant="secondary" onClick={onHome}>返回首页</Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

"use client";
import type { Lesson } from "@/data/types";
import { useProgress } from "@/lib/use-progress";
import { completion, nextLessonId, currentStreak, heatmapCells, todayISO } from "@/lib/progress";
import { CompletionBar } from "./CompletionBar";
import { StreakBadge } from "./StreakBadge";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { ContinueCard } from "./ContinueCard";
import { LessonGrid } from "./LessonGrid";

export function Dashboard({ lessons }: { lessons: Lesson[] }) {
  const { progress, loaded } = useProgress();

  if (!loaded) {
    return <div className="cjk h-64 animate-pulse rounded-2xl bg-surface-soft" aria-hidden />;
  }

  const ids = progress.readLessonIds;
  const today = todayISO();
  const { done, total, pct } = completion(lessons, ids);
  const nextId = nextLessonId(lessons, ids);
  const next = nextId ? lessons.find((l) => l.id === nextId) ?? null : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <CompletionBar done={done} total={total} pct={pct} />
        <StreakBadge streak={currentStreak(progress.activity, today)} />
      </div>
      <ContinueCard lesson={next} />
      <ActivityHeatmap cells={heatmapCells(progress.activity, today, 90)} />
      <section>
        <h2 className="cjk mb-3 text-lg font-bold">全部课文</h2>
        <LessonGrid lessons={lessons} readLessonIds={ids} />
      </section>
    </div>
  );
}

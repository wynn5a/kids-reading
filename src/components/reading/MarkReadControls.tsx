"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useProgress } from "@/lib/use-progress";
import {
  isUnlocked,
  completion,
  currentStreak,
  learnedCharCount,
  celebrationMessage,
  markRead as markReadPure,
  todayISO,
} from "@/lib/progress";
import { getAllLessons } from "@/data/lessons";
import { celebrate, celebrateBig } from "@/lib/celebrate";
import { LessonSummary, type LessonSummaryProps } from "./LessonSummary";

type Stats = Omit<LessonSummaryProps, "onNext" | "onHome">;

export function MarkReadControls({ id, nextId }: { id: number; nextId: number | null }) {
  const router = useRouter();
  const { progress, loaded, markRead } = useProgress();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (loaded && !isUnlocked(id, progress.readLessonIds)) {
      router.replace("/");
    }
  }, [loaded, id, progress.readLessonIds, router]);

  if (!loaded) return null;

  const alreadyRead = progress.readLessonIds.includes(id);

  const finish = () => {
    if (stats) return;
    const today = todayISO();
    const all = getAllLessons();
    const post = markReadPure(progress, id, today);
    markRead(id);

    const isLast = nextId === null;
    if (isLast) celebrateBig();
    else celebrate();

    const { done, total, pct } = completion(all, post.readLessonIds);
    const totalChars = learnedCharCount(all, post.readLessonIds);
    const lessonChars = learnedCharCount(all, [id]);

    setStats({
      done,
      total,
      pct,
      totalChars,
      lessonChars,
      streak: currentStreak(post.activity, today),
      isLast,
      message: celebrationMessage(pct, isLast),
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button onClick={finish} disabled={!!stats}>
          {alreadyRead ? "再读一遍并继续" : "读完了"}
        </Button>
        <Button variant="secondary" onClick={() => router.push("/")}>
          返回首页
        </Button>
      </div>

      {stats && (
        <LessonSummary
          {...stats}
          onNext={() => router.push(nextId ? `/lesson/${nextId}` : "/")}
          onHome={() => router.push("/")}
        />
      )}
    </>
  );
}

import Link from "next/link";
import { Check, Lock } from "lucide-react";
import type { Lesson } from "@/data/types";
import { isUnlocked } from "@/lib/progress";

export function LessonGrid({ lessons, readLessonIds }: { lessons: Lesson[]; readLessonIds: number[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {lessons.map((l) => {
        const read = readLessonIds.includes(l.id);
        const unlocked = isUnlocked(l.id, readLessonIds);
        const inner = (
          <div
            className={`cjk flex h-24 flex-col justify-between rounded-2xl p-4 ${
              read ? "bg-block-mint" : unlocked ? "bg-surface-soft" : "bg-surface-soft opacity-40"
            }`}
          >
            <span className="text-xs text-neutral-500">课文 {l.number}</span>
            <span className="flex items-center gap-1 text-lg font-medium">
              {l.title}
              {read ? (
                <Check className="size-4 text-success" aria-label="已读完" />
              ) : unlocked ? null : (
                <Lock className="size-4 text-neutral-400" aria-label="未解锁" />
              )}
            </span>
          </div>
        );
        return unlocked ? (
          <Link key={l.id} href={`/lesson/${l.id}`}>{inner}</Link>
        ) : (
          <div key={l.id} aria-disabled>{inner}</div>
        );
      })}
    </div>
  );
}

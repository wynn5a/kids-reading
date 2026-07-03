"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useProgress } from "@/lib/use-progress";
import { isUnlocked } from "@/lib/progress";

export function MarkReadControls({ id, nextId }: { id: number; nextId: number | null }) {
  const router = useRouter();
  const { progress, loaded, markRead } = useProgress();

  useEffect(() => {
    if (loaded && !isUnlocked(id, progress.readLessonIds)) {
      router.replace("/");
    }
  }, [loaded, id, progress.readLessonIds, router]);

  if (!loaded) return null;

  const alreadyRead = progress.readLessonIds.includes(id);
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={() => {
          markRead(id);
          router.push(nextId ? `/lesson/${nextId}` : "/");
        }}
      >
        {alreadyRead ? "再读一遍并继续" : "读完了"}
      </Button>
      <Button variant="secondary" onClick={() => router.push("/")}>
        返回首页
      </Button>
    </div>
  );
}

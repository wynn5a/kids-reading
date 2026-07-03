"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useProgress } from "@/lib/use-progress";
import { isUnlocked } from "@/lib/progress";
import { celebrate, celebrateBig } from "@/lib/celebrate";

export function MarkReadControls({ id, nextId }: { id: number; nextId: number | null }) {
  const router = useRouter();
  const { progress, loaded, markRead } = useProgress();
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (loaded && !isUnlocked(id, progress.readLessonIds)) {
      router.replace("/");
    }
  }, [loaded, id, progress.readLessonIds, router]);

  if (!loaded) return null;

  const alreadyRead = progress.readLessonIds.includes(id);

  const finish = () => {
    if (celebrating) return;
    setCelebrating(true);
    markRead(id);
    if (nextId) celebrate();
    else celebrateBig();
    // Let the burst play before moving on.
    setTimeout(() => router.push(nextId ? `/lesson/${nextId}` : "/"), 900);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={finish} disabled={celebrating}>
        {alreadyRead ? "再读一遍并继续" : "读完了"}
      </Button>
      <Button variant="secondary" onClick={() => router.push("/")}>
        返回首页
      </Button>
    </div>
  );
}

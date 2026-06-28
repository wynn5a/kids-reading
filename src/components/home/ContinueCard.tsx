import Link from "next/link";
import type { Lesson } from "@/data/types";
import { Button } from "@/components/ui";

export function ContinueCard({ lesson }: { lesson: Lesson | null }) {
  if (!lesson) {
    return (
      <div className="cjk rounded-2xl bg-block-cream p-6">
        <p className="text-lg font-medium">全部读完啦！🎉</p>
        <p className="mt-1 text-neutral-600">你已经读完了所有课文。</p>
      </div>
    );
  }
  return (
    <div className="cjk flex items-center justify-between rounded-2xl bg-block-lilac p-6">
      <div>
        <p className="text-sm text-neutral-700">继续阅读</p>
        <p className="mt-1 text-xl font-bold">课文 {lesson.number} {lesson.title}</p>
      </div>
      <Link href={`/lesson/${lesson.id}`}>
        <Button>开始</Button>
      </Link>
    </div>
  );
}

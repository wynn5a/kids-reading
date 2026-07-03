import { notFound } from "next/navigation";
import { getAllLessons, getLesson } from "@/data/lessons";
import { LessonPlayer } from "@/components/reading/LessonPlayer";
import { MarkReadControls } from "@/components/reading/MarkReadControls";

export function generateStaticParams() {
  return getAllLessons().map((l) => ({ id: String(l.id) }));
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lessonId = Number(id);
  const lesson = getLesson(lessonId);
  if (!lesson) notFound();

  const nextId = getLesson(lessonId + 1) ? lessonId + 1 : null;

  return (
    <main className="mx-auto flex h-dvh w-full max-w-3xl flex-col overflow-hidden px-6 py-6">
      <header className="shrink-0">
        <p className="text-sm text-neutral-500">课文 {lesson.number}</p>
        <h1 className="cjk mt-1 text-3xl font-bold">{lesson.title}</h1>
        {lesson.author && <p className="cjk mt-1 text-neutral-600">{lesson.author}</p>}
      </header>

      {/* LessonPlayer renders the article (flex-1) and a single footer row —
          playback controls plus the lesson actions passed here — so the whole
          page has one control layer and RubyText's auto-fit sees a stable box. */}
      <LessonPlayer
        id={lessonId}
        lines={lesson.lines}
        actions={<MarkReadControls id={lessonId} nextId={nextId} />}
      />
    </main>
  );
}

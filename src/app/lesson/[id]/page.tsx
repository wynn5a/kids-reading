import { notFound } from "next/navigation";
import { getAllLessons, getLesson } from "@/data/lessons";
import { RubyText } from "@/components/reading/RubyText";
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

      <article className="mt-6 min-h-0 flex-1">
        <RubyText lines={lesson.lines} />
      </article>

      {/* min-height reserves the controls' space so the article box height is
          stable from first paint — the auto-fit measures against it. */}
      <div className="mt-6 flex min-h-12 shrink-0 items-start">
        <MarkReadControls id={lessonId} nextId={nextId} />
      </div>
    </main>
  );
}

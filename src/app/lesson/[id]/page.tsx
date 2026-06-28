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
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm text-neutral-500">课文 {lesson.number}</p>
      <h1 className="cjk mt-1 text-3xl font-bold">{lesson.title}</h1>
      {lesson.author && <p className="cjk mt-1 text-neutral-600">{lesson.author}</p>}

      <article className="mt-10">
        <RubyText lines={lesson.lines} />
      </article>

      <div className="mt-12">
        <MarkReadControls id={lessonId} nextId={nextId} />
      </div>
    </main>
  );
}

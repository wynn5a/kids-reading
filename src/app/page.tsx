import { getAllLessons } from "@/data/lessons";
import { Dashboard } from "@/components/home/Dashboard";

export default function Home() {
  const lessons = getAllLessons();
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="cjk text-3xl font-bold">拼音阅读</h1>
        <p className="cjk mt-1 text-neutral-600">一年级语文 · 每天读一课</p>
      </header>
      <Dashboard lessons={lessons} />
    </main>
  );
}

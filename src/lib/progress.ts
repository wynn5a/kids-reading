import type { Lesson } from "@/data/types";

export type Progress = { readLessonIds: number[]; activity: Record<string, number> };
export const EMPTY_PROGRESS: Progress = { readLessonIds: [], activity: {} };

export function isUnlocked(id: number, readLessonIds: number[]): boolean {
  return id === 1 || readLessonIds.includes(id - 1);
}

export function nextLessonId(lessons: Lesson[], readLessonIds: number[]): number | null {
  for (const l of lessons) {
    if (isUnlocked(l.id, readLessonIds) && !readLessonIds.includes(l.id)) return l.id;
  }
  return null;
}

export function completion(lessons: Lesson[], readLessonIds: number[]) {
  const total = lessons.length;
  const done = lessons.filter((l) => readLessonIds.includes(l.id)).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

export function markRead(progress: Progress, id: number, today: string): Progress {
  const readLessonIds = progress.readLessonIds.includes(id)
    ? progress.readLessonIds
    : [...progress.readLessonIds, id];
  const activity = { ...progress.activity, [today]: (progress.activity[today] ?? 0) + 1 };
  return { readLessonIds, activity };
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function currentStreak(activity: Record<string, number>, today: string): number {
  const has = (d: Date) => (activity[toISO(d)] ?? 0) > 0;
  const cursor = fromISO(today);
  if (!has(cursor)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!has(cursor)) return 0; // neither today nor yesterday
  }
  let streak = 0;
  while (has(cursor)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export type HeatCell = { date: string; count: number };

export function heatmapCells(
  activity: Record<string, number>,
  today: string,
  days = 90,
): HeatCell[] {
  const cells: HeatCell[] = [];
  const end = fromISO(today);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const iso = toISO(d);
    cells.push({ date: iso, count: activity[iso] ?? 0 });
  }
  return cells;
}

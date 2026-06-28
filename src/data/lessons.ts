import data from "./lessons.json";
import type { Lesson } from "./types";

const lessons = data as Lesson[];

export function getAllLessons(): Lesson[] {
  return lessons;
}

export function getLesson(id: number): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}

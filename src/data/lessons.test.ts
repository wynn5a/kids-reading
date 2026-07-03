import { test, expect } from "vitest";
import { getAllLessons, getLesson } from "@/data/lessons";

test("lessons load with sequential ids and valid shape", () => {
  const lessons = getAllLessons();
  expect(lessons.length).toBeGreaterThan(0);
  lessons.forEach((l, i) => {
    expect(l.id).toBe(i + 1);
    expect(typeof l.title).toBe("string");
    expect(Array.isArray(l.lines)).toBe(true);
  });
});

test("getLesson returns by id", () => {
  expect(getLesson(1)?.id).toBe(1);
  expect(getLesson(99999)).toBeUndefined();
});

test("no residual cipher substitutes in pinyin", () => {
  for (const l of getAllLessons())
    for (const line of l.lines)
      for (const t of line)
        expect(/[A-Z]/.test(t.pinyin)).toBe(false);
});

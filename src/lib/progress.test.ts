import { test, expect } from "vitest";
import {
  EMPTY_PROGRESS, isUnlocked, nextLessonId, completion, markRead,
  currentStreak, heatmapCells, toISO, fromISO, learnedCharCount,
} from "@/lib/progress";
import type { Lesson } from "@/data/types";

const lessons: Lesson[] = [1, 2, 3].map((id) => ({
  id, number: String(id), title: `L${id}`, lines: [],
}));

test("unlock is sequential", () => {
  expect(isUnlocked(1, [])).toBe(true);
  expect(isUnlocked(2, [])).toBe(false);
  expect(isUnlocked(2, [1])).toBe(true);
});

test("nextLessonId returns first unlocked unread", () => {
  expect(nextLessonId(lessons, [])).toBe(1);
  expect(nextLessonId(lessons, [1])).toBe(2);
  expect(nextLessonId(lessons, [1, 2, 3])).toBeNull();
});

test("completion counts and percentage", () => {
  expect(completion(lessons, [])).toEqual({ done: 0, total: 3, pct: 0 });
  expect(completion(lessons, [1, 2])).toEqual({ done: 2, total: 3, pct: 67 });
});

test("markRead is immutable and idempotent for ids, bumps activity", () => {
  const p1 = markRead(EMPTY_PROGRESS, 1, "2026-06-28");
  expect(p1.readLessonIds).toEqual([1]);
  expect(p1.activity["2026-06-28"]).toBe(1);
  expect(EMPTY_PROGRESS.readLessonIds).toEqual([]); // original untouched
  const p2 = markRead(p1, 1, "2026-06-28");
  expect(p2.readLessonIds).toEqual([1]); // no dupe
  expect(p2.activity["2026-06-28"]).toBe(2);
});

test("currentStreak counts consecutive days ending today/yesterday", () => {
  expect(currentStreak({ "2026-06-28": 1, "2026-06-27": 1, "2026-06-26": 1 }, "2026-06-28")).toBe(3);
  expect(currentStreak({ "2026-06-27": 1 }, "2026-06-28")).toBe(1); // yesterday still counts
  expect(currentStreak({ "2026-06-26": 1 }, "2026-06-28")).toBe(0); // gap -> broken
  expect(currentStreak({}, "2026-06-28")).toBe(0);
});

test("heatmapCells returns `days` cells ending today, oldest first", () => {
  const cells = heatmapCells({ "2026-06-28": 2 }, "2026-06-28", 7);
  expect(cells).toHaveLength(7);
  expect(cells[6]).toEqual({ date: "2026-06-28", count: 2 });
  expect(cells[0].count).toBe(0);
});

test("date helpers round-trip local dates", () => {
  expect(toISO(fromISO("2026-06-28"))).toBe("2026-06-28");
});

function lesson(id: number, chars: string[][]): Lesson {
  return {
    id,
    number: String(id),
    title: "t",
    lines: chars.map((line) => line.map((c) => ({ char: c, pinyin: "" }))),
  };
}

describe("learnedCharCount", () => {
  const lessons = [
    lesson(1, [["小", "牛", "。"]]),
    lesson(2, [["小", "马", "，"]]), // 小 repeats; 。， are punctuation
  ];

  it("counts distinct CJK characters across read lessons", () => {
    expect(learnedCharCount(lessons, [1, 2])).toBe(3); // 小 牛 马
  });

  it("excludes punctuation and empty when nothing read", () => {
    expect(learnedCharCount(lessons, [1])).toBe(2); // 小 牛 (not 。)
    expect(learnedCharCount(lessons, [])).toBe(0);
  });

  it("ignores unread lessons", () => {
    expect(learnedCharCount(lessons, [2])).toBe(2); // 小 马
  });
});

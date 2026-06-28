import { test, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProgress } from "@/lib/use-progress";

const KEY = "kids-reading:progress:v1";
beforeEach(() => localStorage.clear());

test("loads empty then persists markRead", async () => {
  const { result } = renderHook(() => useProgress());
  await waitFor(() => expect(result.current.loaded).toBe(true));
  expect(result.current.progress.readLessonIds).toEqual([]);

  act(() => result.current.markRead(1));
  await waitFor(() =>
    expect(result.current.progress.readLessonIds).toEqual([1]),
  );
  const stored = JSON.parse(localStorage.getItem(KEY)!);
  expect(stored.readLessonIds).toEqual([1]);
});

test("recovers from corrupt storage", async () => {
  localStorage.setItem(KEY, "not json");
  const { result } = renderHook(() => useProgress());
  await waitFor(() => expect(result.current.loaded).toBe(true));
  expect(result.current.progress.readLessonIds).toEqual([]);
});

import { test, expect } from "vitest";
import { render } from "@testing-library/react";
import { LessonGrid } from "@/components/home/LessonGrid";
import type { Lesson } from "@/data/types";

const lessons: Lesson[] = [1, 2, 3].map((id) => ({
  id, number: String(id), title: `L${id}`, lines: [],
}));

test("renders read links, an unlocked link, and a disabled locked item", () => {
  const { container, getByText } = render(
    <LessonGrid lessons={lessons} readLessonIds={[1]} />,
  );
  // lesson 1 read + lesson 2 unlocked => 2 anchors; lesson 3 locked => not an anchor
  expect(container.querySelectorAll("a")).toHaveLength(2);
  expect(getByText(/L3/).closest("a")).toBeNull();
});

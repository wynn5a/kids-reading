import { test, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { RubyText } from "@/components/reading/RubyText";

const twoLines = [
  [{ char: "天", pinyin: "tiān" }],
  [{ char: "空", pinyin: "kōng" }],
];

test("renders an <rt> per pinyin token and skips punctuation", () => {
  const { container } = render(
    <RubyText lines={[[
      { char: "我", pinyin: "wǒ" },
      { char: "们", pinyin: "men" },
      { char: "，", pinyin: "" },
    ]]} />,
  );
  expect(container.querySelectorAll("rt")).toHaveLength(2);
  expect(container.querySelectorAll("ruby")).toHaveLength(2);
  expect(container.textContent).toContain("，");
});

test("marks the active line with aria-current", () => {
  const { container } = render(<RubyText lines={twoLines} activeLine={1} />);
  const paras = container.querySelectorAll("p");
  expect(paras[0].getAttribute("aria-current")).toBeNull();
  expect(paras[1].getAttribute("aria-current")).toBe("true");
});

test("fires onLineClick with the tapped line index", () => {
  const onLineClick = vi.fn();
  const { container } = render(<RubyText lines={twoLines} onLineClick={onLineClick} />);
  fireEvent.click(container.querySelectorAll("p")[1]);
  expect(onLineClick).toHaveBeenCalledWith(1);
});

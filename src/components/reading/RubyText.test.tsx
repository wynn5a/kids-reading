import { test, expect } from "vitest";
import { render } from "@testing-library/react";
import { RubyText } from "@/components/reading/RubyText";

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

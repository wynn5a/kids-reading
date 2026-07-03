import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LessonSummary } from "./LessonSummary";

const base = {
  done: 3,
  total: 10,
  pct: 30,
  totalChars: 42,
  newChars: 7,
  streak: 5,
  isLast: false,
  message: "太棒了！继续加油！",
  onNext: () => {},
  onHome: () => {},
};

describe("LessonSummary", () => {
  it("shows message, progress, characters learned and streak", () => {
    render(<LessonSummary {...base} />);
    expect(screen.getByText("太棒了！继续加油！")).toBeInTheDocument();
    expect(screen.getByText("读完 3 / 10")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("+7")).toBeInTheDocument();
    expect(screen.getByText("连续阅读 5 天")).toBeInTheDocument();
  });

  it("hides the +N bump when no new characters", () => {
    render(<LessonSummary {...base} newChars={0} />);
    expect(screen.queryByText("+0")).not.toBeInTheDocument();
  });

  it("fires callbacks from the action buttons", () => {
    const onNext = vi.fn();
    const onHome = vi.fn();
    render(<LessonSummary {...base} onNext={onNext} onHome={onHome} />);
    fireEvent.click(screen.getByRole("button", { name: "下一课" }));
    fireEvent.click(screen.getByRole("button", { name: "返回首页" }));
    expect(onNext).toHaveBeenCalledOnce();
    expect(onHome).toHaveBeenCalledOnce();
  });

  it("calls onHome on Escape", () => {
    const onHome = vi.fn();
    render(<LessonSummary {...base} onHome={onHome} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onHome).toHaveBeenCalledOnce();
  });

  it("renders the finale state on the last lesson", () => {
    const onHome = vi.fn();
    render(<LessonSummary {...base} isLast pct={100} message="全部读完啦！你太了不起了！" onHome={onHome} />);
    expect(screen.getByText("全部读完啦！你太了不起了！")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "全部读完啦" }));
    expect(onHome).toHaveBeenCalledOnce();
  });
});

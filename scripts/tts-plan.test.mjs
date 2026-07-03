import { test, expect } from "vitest";
import { planClips } from "./tts-plan.mjs";

const token = (char, pinyin = "x") => ({ char, pinyin });
const line = (text) => [...text].map((c) => token(c));

const lessons = [
  { id: 1, number: "1", title: "秋天", lines: [line("天气凉了，"), line("秋天来了！")] },
  { id: 2, number: "2", title: "小小的船", lines: [line("弯弯的月儿。")] },
];

const allExist = () => true;
const noneExist = () => false;

test("missing mp3 is synthesized", () => {
  const plan = planClips({ lessons, overrides: {}, prevManifest: {}, hasClip: noneExist });
  expect(plan).toHaveLength(3);
  expect(plan.every((c) => c.action === "synth")).toBe(true);
  expect(plan[0]).toMatchObject({ key: "1-0", text: "天气凉了，" });
});

test("existing mp3 with matching manifest text is skipped", () => {
  const prevManifest = {
    "1-0": { text: "天气凉了，" },
    "1-1": { text: "秋天来了！" },
    "2-0": { text: "弯弯的月儿。" },
  };
  const plan = planClips({ lessons, overrides: {}, prevManifest, hasClip: allExist });
  expect(plan.every((c) => c.action === "skip")).toBe(true);
});

test("existing mp3 with changed text is re-synthesized", () => {
  const prevManifest = {
    "1-0": { text: "旧的文字，" },
    "1-1": { text: "秋天来了！" },
    "2-0": { text: "弯弯的月儿。" },
  };
  const plan = planClips({ lessons, overrides: {}, prevManifest, hasClip: allExist });
  expect(plan.find((c) => c.key === "1-0").action).toBe("synth");
  expect(plan.find((c) => c.key === "1-1").action).toBe("skip");
});

test("existing mp3 absent from manifest is re-synthesized", () => {
  const plan = planClips({ lessons, overrides: {}, prevManifest: {}, hasClip: allExist });
  expect(plan.every((c) => c.action === "synth")).toBe(true);
});

test("adding or changing a tts override re-synthesizes that clip", () => {
  const prevManifest = {
    "1-0": { text: "天气凉了，" },
    "1-1": { text: "秋天来了！" },
    "2-0": { text: "弯弯的月儿。" },
  };
  const plan = planClips({
    lessons,
    overrides: { "1-0": "天气（liáng）凉了，" },
    prevManifest,
    hasClip: allExist,
  });
  const changed = plan.find((c) => c.key === "1-0");
  expect(changed).toMatchObject({ action: "synth", text: "天气（liáng）凉了，" });
  expect(plan.find((c) => c.key === "1-1").action).toBe("skip");
});

test("adding a pronunciation hint re-synthesizes that clip", () => {
  const prevManifest = {
    "1-0": { text: "天气凉了，" },
    "1-1": { text: "秋天来了！" },
    "2-0": { text: "弯弯的月儿。" },
  };
  const plan = planClips({
    lessons,
    overrides: {},
    hints: { "1-0": "多音字发音：「凉」读“liáng”。" },
    prevManifest,
    hasClip: allExist,
  });
  const hinted = plan.find((c) => c.key === "1-0");
  expect(hinted).toMatchObject({ action: "synth", hint: "多音字发音：「凉」读“liáng”。" });
  expect(plan.find((c) => c.key === "1-1").action).toBe("skip");
});

test("clip with unchanged hint recorded in the manifest is skipped", () => {
  const hint = "多音字发音：「凉」读“liáng”。";
  const prevManifest = {
    "1-0": { text: "天气凉了，", hint },
    "1-1": { text: "秋天来了！" },
    "2-0": { text: "弯弯的月儿。" },
  };
  const plan = planClips({
    lessons,
    overrides: {},
    hints: { "1-0": hint },
    prevManifest,
    hasClip: allExist,
  });
  expect(plan.every((c) => c.action === "skip")).toBe(true);
});

test("removing a previously recorded hint re-synthesizes", () => {
  const prevManifest = {
    "1-0": { text: "天气凉了，", hint: "多音字发音：「凉」读“liáng”。" },
    "1-1": { text: "秋天来了！" },
    "2-0": { text: "弯弯的月儿。" },
  };
  const plan = planClips({ lessons, overrides: {}, prevManifest, hasClip: allExist });
  expect(plan.find((c) => c.key === "1-0").action).toBe("synth");
});

test("force re-synthesizes everything", () => {
  const prevManifest = {
    "1-0": { text: "天气凉了，" },
    "1-1": { text: "秋天来了！" },
    "2-0": { text: "弯弯的月儿。" },
  };
  const plan = planClips({ lessons, overrides: {}, prevManifest, hasClip: allExist, force: true });
  expect(plan.every((c) => c.action === "synth")).toBe(true);
});

test("whitespace-only lines are excluded from the plan", () => {
  const withBlank = [{ id: 3, number: "3", title: "x", lines: [line("你好。"), [token(" ", "")]] }];
  const plan = planClips({ lessons: withBlank, overrides: {}, prevManifest: {}, hasClip: noneExist });
  expect(plan.map((c) => c.key)).toEqual(["3-0"]);
});

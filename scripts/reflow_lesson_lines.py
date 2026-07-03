"""Merge PDF line breaks that fall mid-sentence, then split overlong rows.

PDF extraction preserves physical row breaks from the page layout. Rows that
end without punctuation (，。！？；：、… or closing quotes/brackets) are joined
with the next row. Lines longer than ``MAX_LINE_LEN`` are then split at the
latest punctuation break that fits.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "src" / "data" / "lessons.json"

# Valid line-ending characters: CJK punctuation plus closing quotes/brackets.
LINE_END = set("，。！？；：、…") | {"\u201c", "\u201d", "」", "》"}

# Target max hanzi per display row (Grade-1 passages are ~12–16 chars wide).
MAX_LINE_LEN = 16

Token = dict[str, str]
Line = list[Token]


def line_text(line: Line) -> str:
    return "".join(t["char"] for t in line)


def ends_properly(line: Line) -> bool:
    text = line_text(line)
    return bool(text) and text[-1] in LINE_END


def merge_mid_sentence_breaks(lines: list[Line]) -> list[Line]:
    """Join consecutive rows when the previous row does not end at punctuation."""
    if not lines:
        return []

    result: list[Line] = [list(lines[0])]
    for line in lines[1:]:
        if not ends_properly(result[-1]):
            result[-1].extend(line)
        else:
            result.append(list(line))

    if len(result) > 1 and not ends_properly(result[-1]):
        result[-2].extend(result.pop())

    return result


def split_long_line(line: Line, max_len: int = MAX_LINE_LEN) -> list[Line]:
    """Split a row at punctuation so each segment is at most ``max_len`` chars."""
    if len(line_text(line)) <= max_len:
        return [line]

    segments: list[Line] = []
    rest = line
    while rest:
        if len(line_text(rest)) <= max_len:
            segments.append(rest)
            break

        best_end: int | None = None
        for i, token in enumerate(rest):
            if len(line_text(rest[: i + 1])) > max_len:
                break
            if token["char"] in LINE_END:
                best_end = i + 1

        if best_end is None:
            for i, token in enumerate(rest):
                if token["char"] in LINE_END:
                    best_end = i + 1
                    break

        if best_end is None:
            segments.append(rest)
            break

        segments.append(rest[:best_end])
        rest = rest[best_end:]

    return segments


def reflow_lines(lines: list[Line], max_len: int = MAX_LINE_LEN) -> list[Line]:
    merged = merge_mid_sentence_breaks(lines)
    out: list[Line] = []
    for line in merged:
        out.extend(split_long_line(line, max_len))
    return out


def reflow_lesson(lesson: dict[str, Any], max_len: int = MAX_LINE_LEN) -> dict[str, Any]:
    return {**lesson, "lines": reflow_lines(lesson["lines"], max_len)}


def reflow_lessons(
    lessons: list[dict[str, Any]], max_len: int = MAX_LINE_LEN
) -> list[dict[str, Any]]:
    return [reflow_lesson(lesson, max_len) for lesson in lessons]


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT_PATH
    lessons = json.loads(path.read_text(encoding="utf-8"))
    reflowed = reflow_lessons(lessons)
    path.write_text(json.dumps(reflowed, ensure_ascii=False, indent=2), encoding="utf-8")
    changed = sum(1 for a, b in zip(lessons, reflowed) if a["lines"] != b["lines"])
    print(f"Reflowed {changed}/{len(lessons)} lessons in {path}")


if __name__ == "__main__":
    main()

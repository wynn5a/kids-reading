"""Merge PDF line breaks that fall mid-sentence, then split overlong rows.

PDF extraction preserves physical row breaks from the page layout. Two kinds
of breaks are page artifacts and get merged with the next row:

- a row ending without punctuation (the page width cut a word/clause), and
- a *full-width* row ending with 逗号/顿号 (the paragraph continues; a short
  comma row is the book's own poem-style line and is kept).

Lines longer than ``MAX_LINE_LEN`` are then split, preferring the latest
sentence end (。！？… + closing quote) that fits, falling back to any
punctuation. A line never ends with a dangling opening quote.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "src" / "data" / "lessons.json"

# Valid line-ending characters: CJK punctuation plus closing quotes/brackets.
# The opening quote “ is deliberately absent — it must never dangle at a
# line end (it belongs with the quoted text on the next line).
LINE_END = set("，。！？；：、…") | {"\u201d", "」", "》"}

# A physical PDF row at least this wide was wrapped by the page, not by the
# author; a trailing 逗号 there means the paragraph continues onto the next
# row. Shorter comma-ended rows are the book's own poem-style lines.
FULL_WIDTH = 13

# Target max hanzi per display row (Grade-1 passages are ~12–16 chars wide).
MAX_LINE_LEN = 16

Token = dict[str, str]
Line = list[Token]


def line_text(line: Line) -> str:
    return "".join(t["char"] for t in line)


def ends_properly(line: Line) -> bool:
    text = line_text(line)
    return bool(text) and text[-1] in LINE_END


def row_continues(row: Line) -> bool:
    """True when a physical PDF row's break is a page artifact, not the book's."""
    text = line_text(row)
    if not text:
        return False
    if text[-1] not in LINE_END:
        return True
    return text[-1] in "，、" and len(text) >= FULL_WIDTH


def merge_mid_sentence_breaks(lines: list[Line]) -> list[Line]:
    """Join consecutive rows whose break is a page artifact (see row_continues)."""
    if not lines:
        return []

    result: list[Line] = [list(lines[0])]
    prev_row = lines[0]
    for line in lines[1:]:
        if row_continues(prev_row):
            result[-1].extend(line)
        else:
            result.append(list(line))
        prev_row = line

    if len(result) > 1 and not ends_properly(result[-1]):
        result[-2].extend(result.pop())

    return result


def sentence_ends_at(line: Line, i: int) -> bool:
    """True when position ``i`` is the last char of a sentence.

    A closing quote counts only after sentence-final punctuation (`。”`);
    conversely, sentence punctuation immediately followed by its closing quote
    defers to the quote so the pair is never split apart.
    """
    ch = line[i]["char"]
    closers = "”」》"
    if ch in "。！？…":
        return i + 1 >= len(line) or line[i + 1]["char"] not in closers
    if ch in closers:
        return i > 0 and line[i - 1]["char"] in "。！？…"
    return False


def split_long_line(line: Line, max_len: int = MAX_LINE_LEN) -> list[Line]:
    """Split a row at punctuation so each segment is at most ``max_len`` chars.

    Prefers the latest sentence end that fits, then the latest punctuation.
    """
    if len(line_text(line)) <= max_len:
        return [line]

    segments: list[Line] = []
    rest = line
    while rest:
        if len(line_text(rest)) <= max_len:
            segments.append(rest)
            break

        best_sentence: int | None = None
        best_punct: int | None = None
        for i, token in enumerate(rest):
            if len(line_text(rest[: i + 1])) > max_len:
                break
            if sentence_ends_at(rest, i):
                best_sentence = i + 1
            if token["char"] in LINE_END:
                best_punct = i + 1
        best_end = best_sentence or best_punct

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

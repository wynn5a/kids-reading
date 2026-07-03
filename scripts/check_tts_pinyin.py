"""Derive 多音字 pronunciation hints for TTS from the textbook pinyin.

The TTS engine only sees plain hanzi and guesses 多音字 readings itself. This
compares the textbook's pinyin (lessons.json) against pypinyin's context
guess — a proxy for a TTS frontend — and flags every mismatch.

    .pdfvenv/bin/python scripts/check_tts_pinyin.py           # report only
    .pdfvenv/bin/python scripts/check_tts_pinyin.py --write   # + write hints

``--write`` regenerates ``src/data/tts-pinyin-hints.json``: one natural-
language 发音指导 sentence per risky clip, which gen-tts.mjs appends to the
MiMo user message (per the usage guide, the user message carries direction).
Keys with a tts-overrides.json entry are skipped — the override already
rewords the spoken text.

一/不 tone sandhi and neutral-tone interjections are excluded from hints:
neural TTS engines almost always handle those natively.
"""
from __future__ import annotations

import json
import unicodedata
from pathlib import Path

from pypinyin import Style, pinyin

ROOT = Path(__file__).resolve().parent.parent
TONE_MARKS = set("āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ")

# Differences a neural TTS handles by itself: 一/不 sandhi, and interjections
# whose tone is prosody-driven.
SANDHI_CHARS = set("一不")
INTERJECTIONS = set("啊啦唉哦呀哪")


def strip_tones(p: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", p) if not unicodedata.combining(c))


def mismatches() -> tuple[list[tuple], list[tuple]]:
    lessons = json.loads((ROOT / "src" / "data" / "lessons.json").read_text("utf-8"))
    overrides = json.loads((ROOT / "src" / "data" / "tts-overrides.json").read_text("utf-8"))

    risky: list[tuple] = []
    benign: list[tuple] = []
    for lesson in lessons:
        for i, line in enumerate(lesson["lines"]):
            key = f"{lesson['id']}-{i}"
            text = "".join(t["char"] for t in line)
            guessed = pinyin(text, style=Style.TONE, heteronym=False, errors=lambda x: [""] * len(x))
            for j, tok in enumerate(line):
                book = tok["pinyin"]
                if not book:
                    continue  # punctuation / 轻声无拼音 / 儿化的儿
                guess = guessed[j][0] if j < len(guessed) else ""
                if not guess:
                    continue
                # 儿化 (huìr) — compare the base syllable.
                base = book[:-1] if book.endswith("r") and len(book) > 2 and tok["char"] != "儿" else book
                if any(c in TONE_MARKS for c in base):
                    same = base == guess
                else:  # textbook prints 轻声 without a tone mark
                    same = strip_tones(base) == strip_tones(guess)
                if same:
                    continue
                entry = (key, tok["char"], book, guess, text, key in overrides)
                if tok["char"] in SANDHI_CHARS or tok["char"] in INTERJECTIONS:
                    benign.append(entry)
                else:
                    risky.append(entry)
    return risky, benign


def build_hints(risky: list[tuple]) -> dict[str, str]:
    """One 发音指导 sentence per clip key, e.g. 多音字发音：「长」读“cháng”。"""
    per_key: dict[str, dict[str, str]] = {}
    for key, ch, book, _guess, _text, overridden in risky:
        if overridden:
            continue  # the override already rewords the spoken text
        per_key.setdefault(key, {})[ch] = book
    return {
        key: "多音字发音：" + "，".join(f"「{ch}」读“{p}”" for ch, p in chars.items()) + "。"
        for key, chars in per_key.items()
    }


def main() -> None:
    import sys

    risky, benign = mismatches()

    print(f"{len(risky)} risky mismatch(es):\n")
    for key, ch, book, guess, text, overridden in risky:
        mark = "override" if overridden else "hint    "
        print(f"  {mark}  {key}  {ch}: 课本={book:8} 引擎默认={guess:8} | {text}")

    print(f"\n{len(benign)} sandhi/interjection difference(s) (TTS handles these natively):")
    for key, ch, book, guess, text, overridden in benign:
        print(f"  ·  {key}  {ch}: 课本={book:8} 猜测={guess:8} | {text}")

    if "--write" in sys.argv:
        hints = build_hints(risky)
        out = ROOT / "src" / "data" / "tts-pinyin-hints.json"
        out.write_text(
            json.dumps(hints, ensure_ascii=False, indent=2, sort_keys=True) + "\n", "utf-8"
        )
        print(f"\nWrote {len(hints)} hint(s) to {out}")


if __name__ == "__main__":
    main()

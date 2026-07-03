"""Report lines where the TTS may not follow the textbook pinyin.

The TTS engine only sees plain hanzi and guesses 多音字 readings itself. This
compares the textbook's pinyin (lessons.json) against pypinyin's context
guess — a proxy for a TTS frontend — and flags every mismatch so it can be
listened to and, if wrong, fixed with a homophone in tts-overrides.json.

    .pdfvenv/bin/python scripts/check_tts_pinyin.py

一/不 tone sandhi and neutral-tone interjections are listed separately:
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


def main() -> None:
    risky, benign = mismatches()
    unhandled = [e for e in risky if not e[5]]

    print(f"{len(risky)} risky mismatch(es), {len(unhandled)} without a tts-override:\n")
    for key, ch, book, guess, text, overridden in risky:
        mark = "✓ override" if overridden else "✗ LISTEN"
        print(f"  {mark}  {key}  {ch}: 课本={book:8} 引擎可能读={guess:8} | {text}")

    print(f"\n{len(benign)} sandhi/interjection difference(s) (TTS usually handles these):")
    for key, ch, book, guess, text, overridden in benign:
        print(f"  ·  {key}  {ch}: 课本={book:8} 猜测={guess:8} | {text}")


if __name__ == "__main__":
    main()

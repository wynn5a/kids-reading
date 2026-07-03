"""Extract 课文 reading passages from the Grade 1 textbook PDF into lessons.json.

The PDF embeds pinyin under a custom font (HanyuXi-JZ) in which tone-marked
vowels are stored as substitute letters/symbols (e.g. 妹 -> ``mFi`` = mèi,
洗 -> ``xJ`` = xǐ). We *learn* the substitute -> toned-vowel cipher by aligning
each (char, raw-pinyin) pair against the char's pypinyin reading, then decode
the textbook's own pinyin (the substitute IS the textbook's toned vowel;
pypinyin only teaches us which Unicode vowel it stands for).
"""
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

import fitz  # PyMuPDF

from reflow_lesson_lines import reflow_lines
from pypinyin import pinyin, Style

# Run-location-independent paths (repo root is the parent of scripts/).
ROOT = Path(__file__).resolve().parent.parent
PDF_PATH = ROOT / "pdf" / "义务教育教科书·语文一年级上册.pdf"
OUT_PATH = ROOT / "src" / "data" / "lessons.json"

TONED = set("āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüêɑ")

# Fonts / sizes observed in the PDF layout.
HAN_FONTS = {"FZKTJW--GB1-0", "FZKTRJK--GBK1-0"}  # body kaiti (incl. highlighted)
PINYIN_FONT = "HanyuXi-JZ"
BODY_PINYIN_SIZE = 10.0   # passage pinyin (grids use 10.5, titles use 12.0)
EXERCISE_FONT = "FZSSJW--GB1-0"  # 园地/exercise instruction text
CJK_PUNCT = set("，。！？、；：“”‘’（）《》—…·")
WS = set("   　\t\n")

# The 课文 (reading-passage) lessons in reading order, with their *printed*
# start page and the printed page of the next TOC entry (lesson or 园地/口语
# 交际) that bounds them. Parsed from the table of contents (PDF pages 3-5).
# Printed -> PDF index offset is a constant +4 (printed 54 == PDF index 58).
PAGE_OFFSET = 4
_LESSON_TOC = [
    # (number, title, author, printed_start, printed_next)
    ("1", "秋天", None, 54, 56),
    ("2", "小小的船", "叶圣陶", 56, 58),
    ("3", "江南", None, 58, 60),
    ("4", "四季", "薛卫民", 60, 62),
    ("5", "影子", "林焕彰", 80, 82),
    ("6", "比尾巴", "程宏明", 82, 84),
    ("7", "青蛙写诗", "张秋生", 84, 87),
    ("8", "雨点儿", "金波", 87, 89),
    ("9", "明天要远足", "方素珍", 93, 96),
    ("10", "大还是小", None, 96, 98),
    ("11", "项链", "金波", 98, 100),
    ("12", "雪地里的小画家", "程宏明", 104, 106),
    ("13", "乌鸦喝水", None, 106, 108),
    ("14", "小蜗牛", None, 108, 111),
]


def _reading(char: str) -> str:
    """Tone-marked pinyin for a single Han character, or '' if not Han."""
    res = pinyin(char, style=Style.TONE, errors="ignore", heteronym=False)
    return res[0][0] if res and res[0] else ""


def derive_cipher(pairs):
    """Learn substitute-char -> toned-vowel map by aligning raw pinyin to pypinyin readings."""
    votes = defaultdict(Counter)
    for char, raw in pairs:
        ref = _reading(char)
        if not ref or len(ref) != len(raw):
            continue  # only align when lengths match (same letter count)
        for r_sub, r_ref in zip(raw, ref):
            if not ("a" <= r_sub <= "z") and r_ref in TONED:
                votes[r_sub][r_ref] += 1
    return {sub: counter.most_common(1)[0][0] for sub, counter in votes.items()}


def decode_pinyin(raw, cipher):
    """Replace substitute characters with their toned vowels; leave ascii untouched."""
    return "".join(cipher.get(ch, ch) for ch in raw)


# A fully-decoded pinyin syllable: only lowercase ascii consonants/vowels, ü,
# and toned vowels, AND it must contain at least one vowel. Empty string (for
# punctuation / 轻声-with-no-pinyin) is allowed by the caller, not here.
_VOWELS = set("aeiouüêɑ") | TONED
_PINYIN_OK = set("bcdfghjklmnpqrstwxyz") | _VOWELS


def is_valid_syllable(pinyin_str):
    """True iff every char is a legal (decoded) pinyin glyph and there is a vowel.

    Rejects leftover substitutes (uppercase or any non-pinyin glyph) AND
    consonant-only fragments like 'l' or stray vowels split off a syllable.
    """
    if not pinyin_str:
        return True
    if any(ch not in _PINYIN_OK for ch in pinyin_str):
        return False
    return any(ch in _VOWELS for ch in pinyin_str)


# --------------------------------------------------------------------------
# PDF layout extraction
# --------------------------------------------------------------------------

def is_han(ch):
    return any("一" <= c <= "鿿" for c in ch)


def _page_spans(page):
    out = []
    for block in page.get_text("dict").get("blocks", []):
        for line in block.get("lines", []):
            for s in line.get("spans", []):
                out.append({
                    "x0": s["bbox"][0], "x1": s["bbox"][2],
                    "y0": round(s["bbox"][1], 1),
                    "size": round(s["size"], 1),
                    "font": s["font"], "text": s["text"],
                })
    return out


def _group_rows(items, tol=6):
    """Cluster items into visual rows by their top y-coordinate."""
    items = sorted(items, key=lambda d: d["y0"])
    rows, cur, cy = [], [], None
    for it in items:
        if cy is None or abs(it["y0"] - cy) <= tol:
            cur.append(it)
            cy = it["y0"] if cy is None else cy
        else:
            rows.append(cur)
            cur, cy = [it], it["y0"]
    if cur:
        rows.append(cur)
    return rows


def _merge_pinyin_fragments(row, gap=1.0):
    """Merge the split pieces of a medial-ü syllable back into one token.

    The font renders a medial ü (e.g. lüè -> 'l' + ü-glyph + 'è') as separate
    spans sitting flush together (gap ~0). We ONLY bridge a fragment into its
    neighbour when one of the two is the narrow ü-glyph and they are essentially
    touching, so normal syllables (which can sit as close as ~2pt) are left
    untouched.
    """
    row = sorted(row, key=lambda d: d["x0"])
    merged = []
    for s in row:
        touching = merged and s["x0"] - merged[-1]["x1"] <= gap
        involves_umlaut = s.get("umlaut") or (merged and merged[-1].get("umlaut"))
        if touching and involves_umlaut:
            prev = merged[-1]
            prev["text"] += s["text"]
            prev["x1"] = s["x1"]
            prev["umlaut"] = prev.get("umlaut") or s.get("umlaut")
        else:
            merged.append(dict(s))
    for m in merged:
        m["xc"] = (m["x0"] + m["x1"]) / 2
    return merged


def extract_lines(page):
    """Return passage lines from one page as lists of {char, raw-pinyin} tokens.

    Each body hanzi (kaiti, ~21pt) is paired with the closest passage-pinyin
    span (HanyuXi 10.0pt) in the row directly above it. Punctuation and chars
    without pinyin (轻声/儿化) get an empty pinyin string.
    """
    spans = _page_spans(page)
    han = [s for s in spans if s["font"] in HAN_FONTS and 19 <= s["size"] <= 23]
    # Passage pinyin spans: the normal 10.0pt glyphs PLUS the small (~8.4pt)
    # whitespace glyph that the font uses for a medial ü in syllables like
    # lüè / nüè (the toneless ü renders as its own narrow span, NOT as a toned
    # substitute). We tag those so they can be merged back into their syllable.
    py = []
    for s in spans:
        if s["font"] != PINYIN_FONT:
            continue
        if abs(s["size"] - BODY_PINYIN_SIZE) < 0.2:
            py.append({**s, "umlaut": False})
        elif s["size"] < BODY_PINYIN_SIZE - 0.5 and s["text"].strip() == "":
            py.append({**s, "umlaut": True})  # medial ü glyph

    # Explode multi-char hanzi spans into individual glyphs with estimated x.
    han_chars = []
    for s in han:
        n = len(s["text"])
        if n == 0:
            continue
        w = (s["x1"] - s["x0"]) / n
        for i, ch in enumerate(s["text"]):
            if ch in WS:
                continue
            han_chars.append({
                "ch": ch,
                "xc": s["x0"] + w * (i + 0.5),
                "x0": s["x0"] + w * i,
                "y0": s["y0"],
            })

    han_rows = _group_rows(han_chars)
    py_rows = _group_rows([{
        "x0": s["x0"], "x1": s["x1"], "y0": s["y0"],
        "text": "ü" if s["umlaut"] else s["text"], "umlaut": s["umlaut"],
    } for s in py])
    # Merge horizontally-contiguous fragments within each pinyin row into whole
    # syllable tokens. Real syllables are separated by >=~5pt; the l / ü / è
    # fragments of "lüè" sit flush together (gap ~0).
    py_rows = [_merge_pinyin_fragments(r) for r in py_rows]

    lines = []
    for hr in sorted(han_rows, key=lambda r: r[0]["y0"]):
        hy = hr[0]["y0"]
        # passage pinyin sits ~12pt above its hanzi row
        cand = [pr for pr in py_rows if pr[0]["y0"] < hy and 6 < hy - pr[0]["y0"] < 18]
        pr = min(cand, key=lambda pr: hy - pr[0]["y0"]) if cand else []
        hr = sorted(hr, key=lambda d: d["x0"])
        hanlist = [h for h in hr if is_han(h["ch"])]

        # Greedy one-to-one: each pinyin token claims its nearest unused hanzi.
        used, assign = set(), {}
        for p in sorted(pr, key=lambda d: d["xc"]):
            best, bd = None, 1e9
            for idx, h in enumerate(hanlist):
                if idx in used:
                    continue
                d = abs(h["xc"] - p["xc"])
                if d < bd:
                    bd, best = d, idx
            if best is not None and bd < 25:
                assign[best] = p["text"]
                used.add(best)

        line, hi = [], 0
        for h in hr:
            if is_han(h["ch"]):
                line.append({"char": h["ch"], "pinyin": assign.get(hi, "")})
                hi += 1
            else:
                line.append({"char": h["ch"], "pinyin": ""})
        if not line:
            continue
        # Drop new-character writing-grid rows: a row with no pinyin at all and
        # no CJK punctuation is a glyph list, not a passage line.
        has_pinyin = any(t["pinyin"] for t in line)
        has_punct = any(c in CJK_PUNCT for t in line for c in t["char"])
        if not has_pinyin and not has_punct:
            continue
        lines.append(line)
    return lines


def find_lessons(doc):
    """Map each 课文 lesson to its passage PDF page range, using the TOC + a
    per-page filter that keeps only reading-passage pages (body kaiti text with
    no 园地/exercise instruction text)."""
    def body21(pno):
        return sum(len(s["text"].strip()) for s in _page_spans(doc[pno])
                   if s["font"] in HAN_FONTS and 19 <= s["size"] <= 23)

    def instr(pno):
        return sum(len(s["text"].strip()) for s in _page_spans(doc[pno])
                   if s["font"] == EXERCISE_FONT and s["size"] >= 14)

    lessons = []
    for num, title, author, p_start, p_next in _LESSON_TOC:
        start = p_start + PAGE_OFFSET
        end = p_next + PAGE_OFFSET  # exclusive
        pages = [p for p in range(start, end) if body21(p) > 0 and instr(p) == 0]
        lessons.append({
            "number": num, "title": title, "author": author,
            "page_range": pages,
        })
    return lessons


def build_cipher_from_doc(doc, lessons_meta):
    """Derive the substitute -> toned-vowel cipher from every (char, raw) pair
    across all passage pages."""
    pairs = []
    for meta in lessons_meta:
        for pno in meta["page_range"]:
            for line in extract_lines(doc[pno]):
                for t in line:
                    if is_han(t["char"]) and t["pinyin"]:
                        pairs.append((t["char"], t["pinyin"]))
    return derive_cipher(pairs)


def main():
    doc = fitz.open(PDF_PATH)
    lessons_meta = find_lessons(doc)
    cipher = build_cipher_from_doc(doc, lessons_meta)

    out, gaps = [], []
    total_chars = 0
    for i, meta in enumerate(lessons_meta, start=1):
        lines = []
        for pno in meta["page_range"]:
            for toks in extract_lines(doc[pno]):
                decoded = [{"char": t["char"], "pinyin": decode_pinyin(t["pinyin"], cipher)}
                           for t in toks]
                for t in decoded:
                    total_chars += 1
                    # Reject ANY non-empty pinyin that isn't a well-formed
                    # syllable: leftover substitutes (uppercase / non-pinyin
                    # glyphs) and vowel-less consonant fragments both fail.
                    if not is_valid_syllable(t["pinyin"]):
                        gaps.append((meta["title"], t))
                lines.append(decoded)
        lesson = {"id": i, "number": meta["number"], "title": meta["title"]}
        if meta.get("author"):
            lesson["author"] = meta["author"]
        lesson["lines"] = reflow_lines(lines)
        out.append(lesson)

    if gaps:
        print("DECODE GAPS:", gaps[:20], file=sys.stderr)
        sys.exit(1)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(out)} lessons ({total_chars} tokens) to {OUT_PATH}")
    print("Cipher:", json.dumps(cipher, ensure_ascii=False))


if __name__ == "__main__":
    main()

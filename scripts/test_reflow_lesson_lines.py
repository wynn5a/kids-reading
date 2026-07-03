from reflow_lesson_lines import merge_mid_sentence_breaks, reflow_lines, line_text


def tok(ch: str, pinyin: str = "") -> dict[str, str]:
    return {"char": ch, "pinyin": pinyin}


def test_merge_mid_sentence_breaks():
    lines = [
        [tok("瓶"), tok("子"), tok("里"), tok("有"), tok("水"), tok("。"), tok("但")],
        [tok("是"), tok("，"), tok("水"), tok("不")],
        [tok("多"), tok("，")],
        [tok("乌"), tok("鸦"), tok("喝"), tok("不"), tok("着"), tok("水"), tok("。")],
    ]
    merged = merge_mid_sentence_breaks(lines)
    assert [line_text(row) for row in merged] == [
        "瓶子里有水。但是，水不多，",
        "乌鸦喝不着水。",
    ]


def test_merge_respects_closing_quote():
    lines = [
        [tok("“"), tok("我"), tok("是"), tok("春"), tok("天"), tok("。"), tok("”")],
        [tok("荷"), tok("叶"), tok("圆"), tok("圆"), tok("，")],
    ]
    merged = merge_mid_sentence_breaks(lines)
    assert len(merged) == 2
    assert line_text(merged[0]) == "“我是春天。”"


def test_split_long_line_at_punctuation():
    line = [tok(c) for c in "乌鸦看见一个瓶子，瓶子里有水。但是，瓶子里水不多，瓶口又小，"]
    assert [line_text(row) for row in reflow_lines([line])] == [
        "乌鸦看见一个瓶子，瓶子里有水。",
        "但是，瓶子里水不多，瓶口又小，",
    ]


def test_reflow_lesson_13_shape():
    # Simulates PDF rows for 乌鸦喝水 before reflow.
    lines = [
        [tok(c) for c in "一只乌鸦口渴了，到处找水喝。"],
        [tok(c) for c in "乌鸦看见一个瓶子，瓶子里有水。但"],
        [tok(c) for c in "是，瓶子里水不"],
        [tok(c) for c in "多，瓶口又小，"],
        [tok(c) for c in "乌鸦喝不着水。"],
        [tok(c) for c in "怎么办呢？"],
        [tok(c) for c in "乌鸦看见旁"],
        [tok(c) for c in "边有许多小石"],
        [tok(c) for c in "子，想出办法"],
        [tok(c) for c in "来了。"],
    ]
    result = [line_text(row) for row in reflow_lines(lines)]
    assert all(len(row) <= 16 for row in result)
    assert result == [
        "一只乌鸦口渴了，到处找水喝。",
        "乌鸦看见一个瓶子，瓶子里有水。",
        "但是，瓶子里水不多，瓶口又小，",
        "乌鸦喝不着水。",
        "怎么办呢？",
        "乌鸦看见旁边有许多小石子，",
        "想出办法来了。",
    ]

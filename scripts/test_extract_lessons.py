from extract_lessons import derive_cipher, decode_pinyin, is_valid_syllable


def test_derive_and_decode():
    # (char, raw_pinyin_with_substitutes) observed from the PDF
    pairs = [
        ("奶", "nAi"),   # nǎi  -> A = ǎ
        ("歌", "gE"),    # gē   -> E = ē
        ("妹", "mFi"),   # mèi  -> F = è
        ("手", "shGu"),  # shǒu -> G = ǒ
        ("洗", "xJ"),    # xǐ   -> J = ǐ
        ("向", "xiSng"), # xiàng-> S = à
        ("排", "pWi"),   # pái  -> W = á
    ]
    cipher = derive_cipher(pairs)
    assert cipher["A"] == "ǎ"
    assert cipher["E"] == "ē"
    assert cipher["F"] == "è"
    assert cipher["G"] == "ǒ"
    assert cipher["J"] == "ǐ"
    assert cipher["S"] == "à"
    assert cipher["W"] == "á"
    assert decode_pinyin("shGu", cipher) == "shǒu"
    assert decode_pinyin("xiSng", cipher) == "xiàng"
    # plain ascii pinyin passes through untouched
    assert decode_pinyin("de", cipher) == "de"


def test_umlaut_medial_syllable():
    # The font stores a medial ü (e.g. lüè / nüè) as its own glyph; the
    # extractor merges it back in as a literal "ü", and the toned tail uses a
    # substitute. The whole syllable must round-trip intact -- this is exactly
    # the input class that previously truncated 略 to "l" and leaked "è".
    pairs = [
        ("妹", "mFi"),   # mèi -> F = è
        ("绿", "lC"),    # lǜ  -> C = ǜ
    ]
    cipher = derive_cipher(pairs)
    assert cipher["F"] == "è"
    # ü passes through unchanged; the substitute supplies the tone.
    assert decode_pinyin("lüF", cipher) == "lüè"   # 略 lüè
    assert decode_pinyin("lC", cipher) == "lǜ"     # 绿 lǜ


def test_decode_gap_guard_rejects_fragments():
    # Empty (punctuation / 轻声 with no pinyin) is allowed.
    assert is_valid_syllable("") is True
    # Well-formed syllables, including ü-medial, are accepted.
    assert is_valid_syllable("hào") is True
    assert is_valid_syllable("lüè") is True
    assert is_valid_syllable("shǒu") is True
    # Leftover uppercase substitutes are rejected.
    assert is_valid_syllable("shGu") is False
    # Vowel-less consonant fragments (the old "l" leak) are rejected.
    assert is_valid_syllable("l") is False
    assert is_valid_syllable("sh") is False

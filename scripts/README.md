# Content pipeline

Extracts 课文 from `pdf/义务教育教科书·语文一年级上册.pdf` into `src/data/lessons.json`.

## Run
    python3 -m venv .pdfvenv
    .pdfvenv/bin/pip install -r scripts/requirements.txt
    .pdfvenv/bin/python scripts/extract_lessons.py

## Test
    .pdfvenv/bin/pytest scripts/test_extract_lessons.py -v

The script decodes the PDF's pinyin font-cipher. It uses `pypinyin` only to
*learn* the substitute-letter -> tone-marked-vowel map by alignment across many
samples; it never overrides the textbook's own readings. Any token with an
undecoded substitute character is logged and causes a non-zero exit.

#!/usr/bin/env bash
# Pad encode_ballot test arrays from MAX_OPTIONS=10 length to MAX_OPTIONS=20.
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
import re

paths = [
    Path("/mnt/e/DECRYPT/FOLD/food contracts/survey/circuits/survey_circuits/lib/src/utils.nr"),
    Path("/home/wilder/tmp/interfold-crisp/repo/examples/survey_circuits/lib/src/utils.nr"),
]

pat = re.compile(r"(encode_ballot(?:::<TEST_DEGREE>)?\()(\[[^\]]*\])")

def pad_array(literal: str) -> str:
    inner = literal[1:-1].strip()
    parts = [] if not inner else [p.strip() for p in inner.split(",")]
    if len(parts) == 20:
        return literal
    if len(parts) != 10:
        raise SystemExit(f"unexpected array length {len(parts)}: {literal}")
    parts.extend(["0"] * 10)
    return "[" + ", ".join(parts) + "]"

for path in paths:
    text = path.read_text()
    count = [0]
    def repl(m, count=count):
        count[0] += 1
        return m.group(1) + pad_array(m.group(2))
    new = pat.sub(repl, text)
    path.write_text(new)
    print(f"{path}: padded {count[0]} arrays")
PY

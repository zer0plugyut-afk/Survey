#!/usr/bin/env python3
import re
from collections import Counter
from pathlib import Path

root = Path("/mnt/e/DECRYPT/FOLD/food contracts/survey/web/src/circuits")
print("PRESET:", (root / "PRESET.txt").read_text().strip())
for p in sorted(root.glob("*.json")):
    t = p.read_text()
    c = Counter(re.findall(r'"length":(\d+)', t))
    print(f"{p.name}: {p.stat().st_size} bytes; lengths={dict(c.most_common(8))}")

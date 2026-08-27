#!/usr/bin/env bash
set -euo pipefail
REPO=/home/wilder/tmp/interfold-crisp/repo
echo "=== secure threshold N/L ==="
grep -E 'pub global (N|L)' "$REPO/circuits/lib/src/configs/secure/threshold.nr" | head -10
echo "=== find build-circuits ==="
find "$REPO" -name 'build-circuits*' 2>/dev/null | head
echo "=== package scripts ==="
python3 - <<'PY'
import json
d=json.load(open("/home/wilder/tmp/interfold-crisp/repo/package.json"))
for k,v in d.get("scripts",{}).items():
    if "circuit" in k.lower() or "build" in k.lower():
        print(f"{k}: {v}")
PY
echo "=== survey circuit uses ==="
grep -n 'threshold::' "$REPO/examples/survey_circuits/bin/survey/src/main.nr" | head
echo "=== default mod ==="
cat "$REPO/circuits/lib/src/configs/default/mod.nr"
echo "=== committee active ==="
cat "$REPO/circuits/lib/src/configs/committee/active.nr" 2>/dev/null || ls "$REPO/circuits/lib/src/configs/committee/"

#!/usr/bin/env bash
set -euo pipefail
SRC="/mnt/e/DECRYPT/FOLD/food contracts/survey/circuits/survey_circuits/lib/src"
DST="/home/wilder/tmp/interfold-crisp/repo/examples/survey_circuits/lib/src"
for f in constants.nr range.nr utils.nr; do
  cp -f "$SRC/$f" "$DST/$f"
done
echo "Synced:"
grep -E 'MAX_OPTIONS|QUESTION_COUNT' "$DST/constants.nr" "$DST/range.nr"

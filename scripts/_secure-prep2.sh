#!/usr/bin/env bash
set -euo pipefail
REPO=/home/wilder/tmp/interfold-crisp/repo
echo "=== secure L and QIS len ==="
grep -n 'pub global L\|pub global QIS\|pub global N\|PLAINTEXT' "$REPO/circuits/lib/src/configs/secure/threshold.nr" | head -20
echo "=== build-circuits help ==="
head -100 "$REPO/scripts/build-circuits.ts"
echo "=== SDK secure moduli (from wasm or docs) ==="
# check if .active-preset exists in sdk package in survey web
ls "$REPO/packages/interfold-sdk" 2>/dev/null | head
cat "$REPO/circuits/bin/.active-preset.json" 2>/dev/null || echo 'no active preset stamp'

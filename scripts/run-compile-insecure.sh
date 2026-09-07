#!/usr/bin/env bash
# Compile survey circuits with the live Sepolia insecure-512 preset.
set -euo pipefail
export CIRCUIT_PRESET=insecure-512
export HOME="${HOME:-/home/wilder}"
export PATH="$HOME/.nargo/bin:$HOME/.interfold/noir/bin:/usr/bin:/bin:$PATH"
mkdir -p "$HOME/tmp"
LOG="$HOME/tmp/compile-insecure-512.log"
bash "/mnt/e/DECRYPT/FOLD/food contracts/survey/scripts/compile-circuits.sh" 2>&1 | tee "$LOG"
echo "EXIT:${PIPESTATUS[0]}" | tee -a "$LOG"

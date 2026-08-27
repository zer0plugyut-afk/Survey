#!/usr/bin/env bash
set -euo pipefail
export CIRCUIT_PRESET=secure-8192
export HOME="${HOME:-/home/wilder}"
export PATH="$HOME/.nargo/bin:$HOME/.interfold/noir/bin:/usr/bin:/bin:$PATH"
exec bash "/mnt/e/DECRYPT/FOLD/food contracts/survey/scripts/compile-circuits.sh"

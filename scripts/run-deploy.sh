#!/usr/bin/env bash
set -euo pipefail
export HOME=/home/wilder
export PATH="$HOME/.foundry/bin:/usr/bin:/bin:$PATH"
cd "/mnt/e/DECRYPT/FOLD/food contracts/survey"
exec bash "./scripts/deploy-program.sh"

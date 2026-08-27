#!/usr/bin/env bash
set -euo pipefail
echo "=== processes ==="
ps aux | grep -E 'compile-circuits|nargo compile|bb write' | grep -v grep || echo '(none)'
echo "=== log ==="
if [[ -f /home/wilder/tmp/compile-secure-8192.log ]]; then
  wc -l /home/wilder/tmp/compile-secure-8192.log
  tail -50 /home/wilder/tmp/compile-secure-8192.log
else
  echo 'no log yet'
fi

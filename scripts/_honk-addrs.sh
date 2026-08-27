#!/usr/bin/env bash
set -euo pipefail
python3 <<'PY'
import json
p="/home/wilder/tmp/honk-deploy/broadcast/DeployHonk.s.sol/11155111/run-latest.json"
for tx in json.load(open(p))["transactions"]:
    print(tx.get("contractName"), tx.get("contractAddress"))
PY

#!/usr/bin/env bash
# Redeploy SurveyProgram only (reuse Honk from deployments/survey-program.env).
set -euo pipefail
export HOME="${HOME:-/home/wilder}"
export PATH="$HOME/.foundry/bin:/usr/bin:/bin:$PATH"
ROOT="/mnt/e/DECRYPT/FOLD/food contracts/survey"
cd "$ROOT"

set -a
source <(tr -d '\r' < "$ROOT/education-survey/.env" | grep -E '^(PRIVATE_KEY|HTTP_RPC_URL|ETHERSCAN_API_KEY|INTERFOLD_ADDRESS)=')
source <(tr -d '\r' < "$ROOT/deployments/survey-program.env")
set +a

: "${PRIVATE_KEY:?}"
: "${HTTP_RPC_URL:?}"
: "${HONK_VERIFIER_ADDRESS:?}"
: "${POSEIDON_T3_ADDRESS:?}"
: "${RISC0_VERIFIER_ADDRESS:?}"

export INTERFOLD_ADDRESS="${INTERFOLD_ADDRESS:-0x3E856E24c7a95d0e04d387f847DA6FA9f6F6c20C}"
export RISC0_VERIFIER_ADDRESS
export HONK_VERIFIER_ADDRESS

echo "Reusing HONK=$HONK_VERIFIER_ADDRESS"
echo "INTERFOLD=$INTERFOLD_ADDRESS"

forge script script/DeployProgram.s.sol:DeployProgram \
  --rpc-url "$HTTP_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --libraries "poseidon-solidity/PoseidonT3.sol:PoseidonT3:${POSEIDON_T3_ADDRESS}" \
  -vvv 2>&1 | tee "$HOME/tmp/deploy-program-only.log"

PROGRAM=$(python3 - <<'PY'
import re
log=open("/home/wilder/tmp/deploy-program-only.log").read()
m=re.search(r"E3_PROGRAM\s+(0x[0-9a-fA-F]{40})", log)
print(m.group(1) if m else "")
PY
)
[ -n "$PROGRAM" ]

IMAGE=$(python3 - <<'PY'
import re
print("0x"+re.search(r"0x([0-9a-fA-F]+)", open("/mnt/e/DECRYPT/FOLD/food contracts/survey/contracts/ImageID.sol").read()).group(1))
PY
)

cat > deployments/survey-program.env <<EOF
INTERFOLD_ADDRESS=$INTERFOLD_ADDRESS
POSEIDON_T3_ADDRESS=$POSEIDON_T3_ADDRESS
IMAGE_ID=$IMAGE
RISC0_VERIFIER_ADDRESS=$RISC0_VERIFIER_ADDRESS
HONK_VERIFIER_ADDRESS=$HONK_VERIFIER_ADDRESS
E3_PROGRAM_ADDRESS=$PROGRAM
EOF
cp -f deployments/survey-program.env deployments/survey-program-v4.env
cat deployments/survey-program.env
echo DEPLOY_PROGRAM_ONLY_DONE

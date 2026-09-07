#!/usr/bin/env bash
# Verify SurveyProgram on Sepolia Etherscan (reads deployments/survey-program.env).
# Honk re-verify is optional — only runs when DeployHonk broadcast JSON is present.
set -euo pipefail
export HOME="${HOME:-/home/wilder}"
export PATH="$HOME/.foundry/bin:/usr/bin:/bin:$PATH"
ROOT="/mnt/e/DECRYPT/FOLD/food contracts/survey"
cd "$ROOT"

set -a
source <(tr -d '\r' < "$ROOT/education-survey/.env" | grep -E '^(HTTP_RPC_URL|ETHERSCAN_API_KEY)=')
set +a
source <(tr -d '\r' < "$ROOT/deployments/survey-program.env")
: "${ETHERSCAN_API_KEY:?}"
: "${E3_PROGRAM_ADDRESS:?}"
: "${POSEIDON_T3_ADDRESS:?}"

CTOR=$(cast abi-encode "constructor(address,address,address,bytes32)" \
  "$INTERFOLD_ADDRESS" "$RISC0_VERIFIER_ADDRESS" "$HONK_VERIFIER_ADDRESS" "$IMAGE_ID")

echo "Verifying SurveyProgram $E3_PROGRAM_ADDRESS"
forge verify-contract "$E3_PROGRAM_ADDRESS" contracts/SurveyProgram.sol:SurveyProgram \
  --chain-id 11155111 \
  --etherscan-api-key "$ETHERSCAN_API_KEY" \
  --constructor-args "$CTOR" \
  --libraries "poseidon-solidity/PoseidonT3.sol:PoseidonT3:${POSEIDON_T3_ADDRESS}" \
  --watch || true

HONK_BROADCAST="${HONK_BROADCAST:-$HOME/tmp/honk-deploy/broadcast/DeployHonk.s.sol/11155111/run-latest.json}"
if [[ -f "$HONK_BROADCAST" ]]; then
  RELATIONS=$(python3 - <<PY
import json
for tx in json.load(open("$HONK_BROADCAST"))["transactions"]:
    if tx.get("contractName")=="RelationsLib":
        print(tx["contractAddress"]); break
PY
)
  ZK=$(python3 - <<PY
import json
for tx in json.load(open("$HONK_BROADCAST"))["transactions"]:
    if tx.get("contractName")=="ZKTranscriptLib":
        print(tx["contractAddress"]); break
PY
)
  if [[ -n "${RELATIONS:-}" && -n "${ZK:-}" ]]; then
    echo "Optional Honk re-verify HONK=$HONK_VERIFIER_ADDRESS RELATIONS=$RELATIONS ZK=$ZK"
    (
      cd "$(dirname "$(dirname "$(dirname "$(dirname "$HONK_BROADCAST")")")")"
      forge verify-contract "$HONK_VERIFIER_ADDRESS" src/SurveyInputHonkVerifier.sol:HonkVerifier \
        --chain-id 11155111 --etherscan-api-key "$ETHERSCAN_API_KEY" \
        --libraries "src/SurveyInputHonkVerifier.sol:RelationsLib:${RELATIONS}" \
        --libraries "src/SurveyInputHonkVerifier.sol:ZKTranscriptLib:${ZK}" --watch || true
    )
  else
    echo "Skipping Honk libs — RelationsLib/ZKTranscriptLib not found in broadcast"
  fi
else
  echo "Skipping Honk re-verify (no broadcast at $HONK_BROADCAST)"
fi

echo VERIFY_DONE
echo "Etherscan: https://sepolia.etherscan.io/address/${E3_PROGRAM_ADDRESS}"

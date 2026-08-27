#!/usr/bin/env bash
set -euo pipefail
export HOME=/home/wilder
export PATH="$HOME/.foundry/bin:/usr/bin:/bin:$PATH"
ROOT="/mnt/e/DECRYPT/FOLD/food contracts/survey"
cd "$ROOT"
set -a
source <(tr -d '\r' < "$ROOT/education-survey/.env" | grep -E '^(HTTP_RPC_URL|ETHERSCAN_API_KEY)=')
set +a
source <(tr -d '\r' < "$ROOT/deployments/survey-program.env")
: "${ETHERSCAN_API_KEY:?}"

# Latest Honk libs from broadcast
RELATIONS=$(python3 - <<'PY'
import json
p="/home/wilder/tmp/honk-deploy/broadcast/DeployHonk.s.sol/11155111/run-latest.json"
for tx in json.load(open(p))["transactions"]:
    if tx.get("contractName")=="RelationsLib":
        print(tx["contractAddress"]); break
PY
)
ZK=$(python3 - <<'PY'
import json
p="/home/wilder/tmp/honk-deploy/broadcast/DeployHonk.s.sol/11155111/run-latest.json"
for tx in json.load(open(p))["transactions"]:
    if tx.get("contractName")=="ZKTranscriptLib":
        print(tx["contractAddress"]); break
PY
)
CTOR=$(cast abi-encode "constructor(address,address,address,bytes32)" \
  "$INTERFOLD_ADDRESS" "$RISC0_VERIFIER_ADDRESS" "$HONK_VERIFIER_ADDRESS" "$IMAGE_ID")
echo "HONK=$HONK_VERIFIER_ADDRESS RELATIONS=$RELATIONS ZK=$ZK PROGRAM=$E3_PROGRAM_ADDRESS"

(
  cd /home/wilder/tmp/honk-deploy
  forge verify-contract "$HONK_VERIFIER_ADDRESS" src/SurveyInputHonkVerifier.sol:HonkVerifier \
    --chain-id 11155111 --etherscan-api-key "$ETHERSCAN_API_KEY" \
    --libraries "src/SurveyInputHonkVerifier.sol:RelationsLib:${RELATIONS}" \
    --libraries "src/SurveyInputHonkVerifier.sol:ZKTranscriptLib:${ZK}" --watch || true
  forge verify-contract "$RELATIONS" src/SurveyInputHonkVerifier.sol:RelationsLib \
    --chain-id 11155111 --etherscan-api-key "$ETHERSCAN_API_KEY" --watch || true
  forge verify-contract "$ZK" src/SurveyInputHonkVerifier.sol:ZKTranscriptLib \
    --chain-id 11155111 --etherscan-api-key "$ETHERSCAN_API_KEY" --watch || true
)

forge verify-contract "$E3_PROGRAM_ADDRESS" contracts/SurveyProgram.sol:SurveyProgram \
  --chain-id 11155111 --etherscan-api-key "$ETHERSCAN_API_KEY" \
  --constructor-args "$CTOR" \
  --libraries "poseidon-solidity/PoseidonT3.sol:PoseidonT3:${POSEIDON_T3_ADDRESS}" --watch || true
echo VERIFY_DONE

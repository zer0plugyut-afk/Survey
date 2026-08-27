#!/usr/bin/env bash
# Deploy survey HonkVerifier (isolated, via_ir=false) then SurveyProgram (via_ir=true + Poseidon link).
# Env (education-survey/.env): PRIVATE_KEY, HTTP_RPC_URL, optional INTERFOLD_ADDRESS, ETHERSCAN_API_KEY
#
# RISC Zero verifier is NOT deployed — use the official Sepolia router.
# PoseidonT3 is NOT redeployed — link the existing Sepolia library (EIP-170).
set -euo pipefail
export HOME="${HOME:-/home/wilder}"
export PATH="$HOME/.foundry/bin:/usr/bin:/bin:$PATH"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/education-survey/.env"
set -a
source <(tr -d '\r' < "$ENV_FILE" | grep -E '^(PRIVATE_KEY|HTTP_RPC_URL|ETHERSCAN_API_KEY|INTERFOLD_ADDRESS)=')
set +a
: "${PRIVATE_KEY:?}"
: "${HTTP_RPC_URL:?}"

# Sepolia constants (shared InterFold stack)
INTERFOLD="${INTERFOLD_ADDRESS:-0x3E856E24c7a95d0e04d387f847DA6FA9f6F6c20C}"
POSEIDON=0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93
RISC0=0x925d8331ddc0a1F0d96E68CF073DFE1d92b69187

IMAGE=$(python3 - <<'PY'
import re
print("0x"+re.search(r"0x([0-9a-fA-F]+)", open("contracts/ImageID.sol").read()).group(1))
PY
)

SRC="$ROOT/generated/verifiers/SurveyInputHonkVerifier.sol"
[ -f "$SRC" ] || { echo "Missing $SRC — run scripts/compile-circuits.sh first"; exit 1; }

HONK_WORK="$HOME/tmp/honk-deploy"
mkdir -p "$HONK_WORK"/{src,script,lib}
cp -f "$SRC" "$HONK_WORK/src/SurveyInputHonkVerifier.sol"

if [ ! -d "$HONK_WORK/lib/forge-std" ]; then
  git clone --depth 1 https://github.com/foundry-rs/forge-std "$HONK_WORK/lib/forge-std"
fi

cat >"$HONK_WORK/foundry.toml" <<'EOF'
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
script = "script"
solc_version = "0.8.28"
optimizer = true
optimizer_runs = 200
via_ir = false
remappings = ["forge-std/=lib/forge-std/src/"]
EOF

cat >"$HONK_WORK/script/DeployHonk.s.sol" <<'SOL'
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.21;
import { Script, console2 } from "forge-std/Script.sol";
import { HonkVerifier } from "../src/SurveyInputHonkVerifier.sol";

contract DeployHonk is Script {
    function run() external {
        vm.startBroadcast();
        HonkVerifier honk = new HonkVerifier();
        vm.stopBroadcast();
        console2.log("HONK_VERIFIER", address(honk));
    }
}
SOL

echo "=== deploy HonkVerifier (auto-links RelationsLib + ZKTranscriptLib) ==="
(
  cd "$HONK_WORK"
  forge script script/DeployHonk.s.sol:DeployHonk \
    --rpc-url "$HTTP_RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    -vvv 2>&1 | tee "$HOME/tmp/deploy-honk.log"
)

HONK=$(python3 - <<PY
import re
log=open("$HOME/tmp/deploy-honk.log").read()
m=re.search(r"HONK_VERIFIER\s+(0x[0-9a-fA-F]{40})", log)
print(m.group(1) if m else "")
PY
)
echo "HONK=$HONK"
[ -n "$HONK" ]

CODE=$(cast code "$HONK" --rpc-url "$HTTP_RPC_URL")
echo "Honk bytecode bytes=$(( (${#CODE}-2)/2 ))"

# Do not compile Honk inside the SurveyProgram forge project (stack-too-deep with via_ir).
rm -f contracts/SurveyInputHonkVerifier.sol

cat > foundry.toml <<EOF
[profile.default]
src = "contracts"
out = "out"
libs = ["lib"]
script = "script"
solc_version = "0.8.28"
optimizer = true
optimizer_runs = 200
via_ir = true
libraries = ["poseidon-solidity/PoseidonT3.sol:PoseidonT3:${POSEIDON}"]
remappings = [
  "@interfold/contracts/=web/node_modules/@interfold/contracts/",
  "@zk-kit/=web/node_modules/@zk-kit/",
  "poseidon-solidity/=web/node_modules/poseidon-solidity/",
  "@openzeppelin/=web/node_modules/@openzeppelin/",
  "forge-std/=lib/forge-std/src/",
]
[rpc_endpoints]
sepolia = "\${HTTP_RPC_URL}"
EOF

cat > script/DeployProgram.s.sol <<'SOL'
// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.28;
import { Script, console2 } from "forge-std/Script.sol";
import { SurveyProgram } from "../contracts/SurveyProgram.sol";
import { ImageID } from "../contracts/ImageID.sol";
import { IInterfoldCore, IRiscZeroVerifier, IHonkVerifier } from "../contracts/SurveyProgram.sol";

contract DeployProgram is Script {
    function run() external {
        address interfold = vm.envAddress("INTERFOLD_ADDRESS");
        address risc0 = vm.envAddress("RISC0_VERIFIER_ADDRESS");
        address honk = vm.envAddress("HONK_VERIFIER_ADDRESS");
        bytes32 imageId = ImageID.PROGRAM_ID;
        vm.startBroadcast();
        SurveyProgram program = new SurveyProgram(
            IInterfoldCore(interfold),
            IRiscZeroVerifier(risc0),
            IHonkVerifier(honk),
            imageId
        );
        vm.stopBroadcast();
        console2.log("INTERFOLD", interfold);
        console2.log("RISC0_VERIFIER", risc0);
        console2.log("HONK_VERIFIER", honk);
        console2.log("IMAGE_ID");
        console2.logBytes32(imageId);
        console2.log("E3_PROGRAM", address(program));
    }
}
SOL

export INTERFOLD_ADDRESS="$INTERFOLD"
export RISC0_VERIFIER_ADDRESS="$RISC0"
export HONK_VERIFIER_ADDRESS="$HONK"

echo "=== deploy SurveyProgram ==="
forge script script/DeployProgram.s.sol:DeployProgram \
  --rpc-url "$HTTP_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --libraries "poseidon-solidity/PoseidonT3.sol:PoseidonT3:${POSEIDON}" \
  -vvv 2>&1 | tee "$HOME/tmp/deploy-program.log"

PROGRAM=$(python3 - <<PY
import re
log=open("$HOME/tmp/deploy-program.log").read()
m=re.search(r"E3_PROGRAM\s+(0x[0-9a-fA-F]{40})", log)
print(m.group(1) if m else "")
PY
)
[ -n "$PROGRAM" ]

mkdir -p deployments
cat > deployments/survey-program.env <<EOF
INTERFOLD_ADDRESS=$INTERFOLD
POSEIDON_T3_ADDRESS=$POSEIDON
IMAGE_ID=$IMAGE
RISC0_VERIFIER_ADDRESS=$RISC0
HONK_VERIFIER_ADDRESS=$HONK
E3_PROGRAM_ADDRESS=$PROGRAM
EOF
# Keep v4 alias for existing docs/UI references
cp -f deployments/survey-program.env deployments/survey-program-v4.env
cat deployments/survey-program.env
echo DEPLOY_DONE

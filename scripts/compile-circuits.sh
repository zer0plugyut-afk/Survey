#!/usr/bin/env bash
# Doc-faithful port of InterFold examples/CRISP/scripts/compile_circuits.sh
# https://docs.theinterfold.com/noir-circuits — “Solidity verifiers (example: CRISP)”
#
# Flow (from docs):
#   1) nargo compile user_data_encryption_ct0 / ct1 / wrapper
#   2) bb write_vk -t noir-recursive-no-zk for those
#   3) nargo compile app circuit (survey) + recursive VK
#   4) nargo compile fold (verifies user_data_encryption + survey)
#   5) bb write_vk --oracle_hash keccak on fold
#   6) bb write_solidity_verifier → SurveyFoldVerifier.sol
#
# Preset (docs):
#   CIRCUIT_PRESET=secure-8192   # Sepolia / production (default for this project)
#   CIRCUIT_PRESET=insecure-512  # local fast only
#
# Toolchain pins (docs): nargo v1.0.0-beta.26, bb via `interfold noir setup` (5.1.x)
set -euo pipefail
export HOME="${HOME:-/home/wilder}"
export PATH="$HOME/.nargo/bin:$HOME/.interfold/noir/bin:/usr/bin:/bin:$PATH"

REPO_ROOT="${INTERFOLD_REPO:-/home/wilder/tmp/interfold-crisp/repo}"
SURVEY_ROOT="${SURVEY_ROOT:-/mnt/e/DECRYPT/FOLD/food contracts/survey}"
CIRCUIT_PRESET="${CIRCUIT_PRESET:-secure-8192}"

INTERFOLD_CIRCUITS="$REPO_ROOT/circuits"
SURVEY_CIRCUITS="$REPO_ROOT/examples/survey_circuits"
VERIFIER_DIR="$SURVEY_ROOT/generated/verifiers"
WEB_CIRCUITS="$SURVEY_ROOT/web/src/circuits"
mkdir -p "$VERIFIER_DIR" "$INTERFOLD_CIRCUITS/bin/threshold/target" "$WEB_CIRCUITS"

echo "nargo: $(nargo --version | head -1)"
echo "bb:    $(bb --version)"
echo "preset: $CIRCUIT_PRESET"
echo "interfold circuits: $INTERFOLD_CIRCUITS"
echo "survey circuits:    $SURVEY_CIRCUITS"

bash "$SURVEY_ROOT/scripts/set-circuit-preset.sh" "$CIRCUIT_PRESET"

echo "Compiling interfold user_data_encryption circuits (dependencies)..."

echo "Compiling user_data_encryption_ct0..."
(cd "$INTERFOLD_CIRCUITS/bin/threshold/user_data_encryption_ct0" && nargo compile)

echo "Compiling user_data_encryption_ct1..."
(cd "$INTERFOLD_CIRCUITS/bin/threshold/user_data_encryption_ct1" && nargo compile)

echo "Compiling user_data_encryption..."
(cd "$INTERFOLD_CIRCUITS/bin/threshold/user_data_encryption" && nargo compile)

THRESHOLD_TARGET="${INTERFOLD_CIRCUITS}/bin/threshold/target"
echo "Writing noir-recursive-no-zk VKs (user_data_encryption)..."
for name in user_data_encryption_ct0 user_data_encryption_ct1 user_data_encryption; do
  bb write_vk -b "${THRESHOLD_TARGET}/${name}.json" -o "${THRESHOLD_TARGET}" -t noir-recursive-no-zk
  mv "${THRESHOLD_TARGET}/vk" "${THRESHOLD_TARGET}/${name}.vk_recursive"
  mv "${THRESHOLD_TARGET}/vk_hash" "${THRESHOLD_TARGET}/${name}.vk_recursive_hash"
done

STACK="survey:fold:survey_fold:SurveyFoldVerifier.sol"
IFS=":" read -r app_dir fold_dir fold_pkg verifier_file <<<"$STACK"
app_target="${SURVEY_CIRCUITS}/bin/${app_dir}/target"

echo "Compiling ${app_dir} circuit..."
(cd "$SURVEY_CIRCUITS/bin/${app_dir}" && nargo compile)

echo "Writing noir-recursive-no-zk VK for ${app_dir}..."
bb write_vk -b "${app_target}/${app_dir}.json" -o "${app_target}" -t noir-recursive-no-zk
mv "${app_target}/vk" "${app_target}/${app_dir}.vk_recursive"
mv "${app_target}/vk_hash" "${app_target}/${app_dir}.vk_recursive_hash"

echo "Compiling ${fold_dir} circuit (verifies user_data_encryption + ${app_dir})..."
(cd "$SURVEY_CIRCUITS/bin/${fold_dir}" && nargo compile)

echo "Generating ${fold_dir} Verifier Key (keccak / EVM)..."
bb write_vk -b "$SURVEY_CIRCUITS/bin/${fold_dir}/target/${fold_pkg}.json" \
  -o "$SURVEY_CIRCUITS/bin/${fold_dir}/target" --oracle_hash keccak

echo "Generating Solidity Verifier ${verifier_file}..."
bb write_solidity_verifier \
  -k "$SURVEY_CIRCUITS/bin/${fold_dir}/target/vk" \
  -o "$SURVEY_CIRCUITS/bin/${fold_dir}/target/${verifier_file}"

cp -f "$SURVEY_CIRCUITS/bin/${fold_dir}/target/${verifier_file}" "${VERIFIER_DIR}/${verifier_file}"
cp -f "${VERIFIER_DIR}/${verifier_file}" "${VERIFIER_DIR}/SurveyInputHonkVerifier.sol"

patch_verifier() {
  local verifier_path="$1"
  python3 - "$verifier_path" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text()
replacements = [
    (
        "bytes4 internal constant FRLIB_MODEXP_FAILED_SELECTOR = 0xf8d61709;",
        "bytes4 internal constant FRLIB_MODEXP_FAILED_SELECTOR = 0x1f7ec5f0;",
    ),
    (
        "    error ConsistencyCheckFailed();",
        "    error ConsistencyCheckFailed();\n    error VerificationKeyConfigurationMismatch();",
    ),
    (
        "        proofLength += NUM_ELEMENTS_COMM * 3; // Libra concat, grand sum, quotient comms + Gemini masking",
        "        proofLength += NUM_ELEMENTS_COMM * 3; // Libra concat, grand sum, quotient comms",
    ),
    (
        """    constructor(uint256 _N, uint256 _logN, uint256 _vkHash, uint256 _numPublicInputs) {
        $N = _N;
        $LOG_N = _logN;
        $VK_HASH = _vkHash;
        $NUM_PUBLIC_INPUTS = _numPublicInputs;
        $MSMSize = NUMBER_UNSHIFTED_ZK + _logN + LIBRA_COMMITMENTS + 2;
    }
""",
        """    constructor(uint256 _N, uint256 _logN, uint256 _vkHash, uint256 _numPublicInputs) {
        $N = _N;
        $LOG_N = _logN;
        $VK_HASH = _vkHash;
        $NUM_PUBLIC_INPUTS = _numPublicInputs;
        $MSMSize = NUMBER_UNSHIFTED_ZK + _logN + LIBRA_COMMITMENTS + 2;
    }

    function validateVerificationKey(Honk.VerificationKey memory vk) internal view {
        require($N == vk.circuitSize, Errors.VerificationKeyConfigurationMismatch());
        require($LOG_N == vk.logCircuitSize, Errors.VerificationKeyConfigurationMismatch());
        require($NUM_PUBLIC_INPUTS == vk.publicInputsSize, Errors.VerificationKeyConfigurationMismatch());
    }
""",
    ),
    (
        """contract HonkVerifier is BaseZKHonkVerifier(N, LOG_N, VK_HASH, NUMBER_OF_PUBLIC_INPUTS) {
    function loadVerificationKey() internal pure override returns (Honk.VerificationKey memory) {
""",
        """contract HonkVerifier is BaseZKHonkVerifier(N, LOG_N, VK_HASH, NUMBER_OF_PUBLIC_INPUTS) {
    constructor() {
        validateVerificationKey(HonkVerificationKey.loadVerificationKey());
    }

    function loadVerificationKey() internal pure override returns (Honk.VerificationKey memory) {
""",
    ),
]
for old, new in replacements:
    if old not in text:
        print(f"skip missing patch snippet: {old[:60]!r}")
        continue
    if text.count(old) != 1:
        raise SystemExit(f"expected one match, found {text.count(old)}: {old[:80]}")
    text = text.replace(old, new)
path.write_text(text)
print("patched", path)
PY
}

patch_verifier "${VERIFIER_DIR}/${verifier_file}" || true
cp -f "${VERIFIER_DIR}/${verifier_file}" "${VERIFIER_DIR}/SurveyInputHonkVerifier.sol"

# Frontend artifacts: secure stack (SDK npm embed is still N=512 — client proves with these JSON files)
cp -f "${THRESHOLD_TARGET}/user_data_encryption_ct0.json" "$WEB_CIRCUITS/"
cp -f "${THRESHOLD_TARGET}/user_data_encryption_ct1.json" "$WEB_CIRCUITS/"
cp -f "${THRESHOLD_TARGET}/user_data_encryption.json" "$WEB_CIRCUITS/"
cp -f "${app_target}/${app_dir}.json" "$WEB_CIRCUITS/survey.json"
cp -f "$SURVEY_CIRCUITS/bin/${fold_dir}/target/${fold_pkg}.json" "$WEB_CIRCUITS/survey_fold.json"
echo "$CIRCUIT_PRESET" > "$WEB_CIRCUITS/PRESET.txt"

grep -E "NUMBER_OF_PUBLIC_INPUTS" "${VERIFIER_DIR}/${verifier_file}" | head -3
echo "Wrote ${VERIFIER_DIR}/${verifier_file}"
echo "Copied circuit JSON → $WEB_CIRCUITS (preset=$CIRCUIT_PRESET)"
ls -la "$WEB_CIRCUITS"
echo COMPILE_SURVEY_FOLD_DONE

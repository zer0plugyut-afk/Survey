# Circuits (InterFold docs)

We follow [Noir Circuits](https://docs.theinterfold.com/noir-circuits) and [Cryptography](https://docs.theinterfold.com/cryptography).

## What the docs require for user inputs (P3)

- Encryption proofs use **`user_data_encryption_ct0` / `ct1` / `user_data_encryption`** (GRECO-style BFV under the committee key).
- App programs (like CRISP) add an **app circuit + fold** that recursively verifies those encryption proofs and app rules, then emit an on-chain Honk verifier from the **fold** (`bb write_vk --oracle_hash keccak` → `bb write_solidity_verifier`).

## BFV presets (official SDK)

| Preset | `paramSet` | N | L | Use |
| --- | --- | --- | --- | --- |
| `INSECURE_THRESHOLD_512` | `0` | 512 | 2 | **Sepolia + local dev (this deployment)** |
| `SECURE_THRESHOLD_8192` | `1` | 8192 | **3** | Mainnet / production |

## This survey (live compile: insecure-512)

Sources next to the InterFold checkout (same layout as `examples/CRISP`):

- `user_data_encryption*` — InterFold `circuits/bin/threshold/`
- `survey` — app circuit (commitments + allowed-value range)
- `survey_fold` — verifies `user_data_encryption` + `survey` (on-chain target)

```bash
# WSL — pins: nargo v1.0.0-beta.26, bb 5.1.x via interfold noir setup
CIRCUIT_PRESET=insecure-512 ./scripts/compile-circuits.sh
./scripts/deploy-program.sh
./scripts/verify-program.sh
```

Frontend: `INSECURE_THRESHOLD_512` + `paramSet: 0` + `web/src/circuits/*.json` from the same compile.

### Client proving

1. `encryptNumberAndGenInputs` (SDK WASM, insecure-512)
2. Prove UDE ct0 → ct1 → wrapper with **compiled** `web/src/circuits/*.json` (**not** npm `generateProof`)
3. Prove `survey` → `survey_fold` with `verifierTarget: 'evm'`

See [SDK — Proving: embedded circuits or your own](https://docs.theinterfold.com/sdk#proving-embedded-circuits-or-your-own).

### On-chain PI layout (7)

0 schemaId · 1 respondent · 2 questionIndex · 3 min · 4 max · 5 ct commitment · 6 committee pk commitment (fold return)

See `deployments/survey-program.env` for live Honk + program addresses.

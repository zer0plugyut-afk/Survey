# Circuits

## Live stack (what Sepolia uses)

Compiled JSON consumed by the frontend prover (`web/src/utils/surveyFoldProof.ts`):

| Artifact | Path |
| --- | --- |
| Frontend JSON | `web/src/circuits/*.json` |
| Preset | `web/src/circuits/PRESET.txt` → `insecure-512` |

Noir **app + fold** sources used to produce those artifacts (and the Honk verifier):

```text
circuits/survey_circuits/
├── bin/survey/     # app circuit (range / schema / commitments)
├── bin/fold/       # survey_fold — verifies UDE + survey; on-chain Honk target
└── lib/            # shared helpers
```

InterFold **UDE** (`user_data_encryption_ct0` / `ct1` / wrapper) lives in the InterFold repo `circuits/bin/threshold/` and is compiled first; JSON copies land in `web/src/circuits/`.

Compile (WSL):

```bash
CIRCUIT_PRESET=insecure-512 ./scripts/compile-circuits.sh
```

That script currently points at an InterFold checkout via `INTERFOLD_REPO` and copies JSON → `web/src/circuits/` plus the Solidity verifier → `generated/verifiers/`.

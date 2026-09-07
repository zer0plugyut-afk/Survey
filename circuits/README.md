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

**Packing (CRISP-aligned):** each answer is encoded into the `questionIndex` binary segment of the first `MAX_MSG_NON_ZERO_COEFFS` plaintext coeffs (`web/src/utils/surveyEncoding.ts`), encrypted with `encryptVectorAndGenInputs`, and range-checked in `survey_circuits/lib/src/range.nr`. The FHE guest can stay sum-all; decrypt + `decodeSurveyTally` yields per-question totals. See [CRISP introduction](https://docs.theinterfold.com/CRISP/introduction) and `examples/CRISP/packages/crisp-sdk/src/encoding.ts`.

Compile (WSL):

```bash
CIRCUIT_PRESET=insecure-512 ./scripts/compile-circuits.sh
```

After changing survey Noir sources you must recompile (survey + survey_fold), copy JSON → `web/src/circuits/`, and redeploy the Honk verifier — the fold embeds the survey VK.

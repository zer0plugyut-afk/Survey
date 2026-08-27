# Education Survey (InterFold E3)

Privacy-preserving education survey on **Sepolia**: respondents encrypt answers under a committee key; `SurveyProgram` verifies a **survey_fold** Honk proof per answer, accumulates commitments in a LazyIMT, and later checks a **RISC Zero** compute proof.

## Live Sepolia stack

| Piece | Address / value |
| --- | --- |
| **SurveyProgram** | [`0x7e7Fe6c3216897A619D2e7aD0D3136B0f4d11833`](https://sepolia.etherscan.io/address/0x7e7Fe6c3216897A619D2e7aD0D3136B0f4d11833) |
| **Honk (survey_fold)** | [`0x4C1E70E22BaFcF0B1B96F127333aE7eEbe23988A`](https://sepolia.etherscan.io/address/0x4C1E70E22BaFcF0B1B96F127333aE7eEbe23988A) |
| **ImageID** | `0xfee29cd903a15e5752c68fb64c019f0ff5fb7a5f31e533dc5ca38dd4162c0c1e` |
| **RISC Zero router** | `0x925d8331ddc0a1F0d96E68CF073DFE1d92b69187` (shared) |
| **PoseidonT3** | `0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93` (linked) |
| **BFV** | `INSECURE_THRESHOLD_512` / `paramSet: 0` |

Whitelist: InterFold must `registerE3Program` on the SurveyProgram address. See `docs/SUBMIT-PROGRAM.md`.

## Layout

```text
contracts/                 SurveyProgram.sol, ImageID.sol
circuits/survey_circuits/  Noir survey + survey_fold sources
web/src/circuits/          compiled JSON used by the browser prover
web/                       React + Vite UI
generated/verifiers/       keccak Honk verifier from survey_fold
e3/program/                RISC Zero guest (ImageID source)
scripts/                   compile / deploy / verify helpers
docs/                      circuits, submit, steps
deployments/               address env (no private keys)
```

## Circuits (CRISP-style)

1. InterFold `user_data_encryption_*` (Greco)
2. App `survey` circuit
3. `survey_fold` (verifies UDE + survey) → keccak Honk

Frontend prove path: `web/src/utils/surveyFoldProof.ts` imports `web/src/circuits/*.json`.

Details: `docs/CIRCUITS.md`, `circuits/README.md`.

## App

```bash
cd web && pnpm install && pnpm dev
```

Config: `web/src/config/sepolia.ts` + local `web/.env.local` (not committed).

## Program notes

- `validate` — InterFold only
- `publishInput` — `respondent == msg.sender`; emits full ciphertext
- Uses `IInterfold` / `E3` from `@interfold/contracts`

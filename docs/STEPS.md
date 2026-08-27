# STEPS — build the next InterFold E3 program (like Survey)

Use this when writing a **new** program contract. The survey repo is the reference implementation; swap circuit + guest + Solidity, keep the same toolchain and deploy pattern.

## Mental model

```text
                    ┌─────────────────────┐
  respondents ──►   │  Honk input proof   │ ──► publishInput (your program)
                    └─────────────────────┘
                              │
                    Merkle of commitments
                              │
                    ┌─────────────────────┐
  aggregator ──►    │ RISC Zero compute   │ ──► verify (your program)
                    └─────────────────────┘
```

Your program constructor always looks like:

```solidity
constructor(
  IInterfoldCore interfold,
  IRiscZeroVerifier risc0,   // Sepolia router — do not deploy
  IHonkVerifier honk,        // you deploy (from your circuit)
  bytes32 imageId            // from your guest compile
)
```

| Dependency | Action |
| --- | --- |
| InterFold core | Use published Sepolia address |
| RISC Zero verifier | Use official Sepolia **router** — already deployed |
| PoseidonT3 | Link existing Sepolia library (too large to redeploy) |
| Honk verifier | Compile from **your** Noir circuit → deploy |
| ImageID | Compile **your** RISC Zero guest → copy `ImageID.sol` |
| E3 program | Deploy **your** Solidity, then ask InterFold to whitelist |

## 0. Prerequisites (once per machine)

- WSL2 Ubuntu + Docker Desktop (WSL2 backend)
- Foundry (`forge`, `cast`)
- `interfold` CLI
- `rzup` / cargo-risczero (for guest tooling InterFold expects)
- Node 22+ for the web app / `@interfold/contracts` remappings
- `interfold noir setup` → bb **5.1.x**
- `noirup -v v1.0.0-beta.26` (must match bb ACIR / msgpack)

Secrets in `education-survey/.env` (never commit):

```env
PRIVATE_KEY=0x...
HTTP_RPC_URL=https://...
ETHERSCAN_API_KEY=...
INTERFOLD_ADDRESS=0x3E856E24c7a95d0e04d387f847DA6FA9f6F6c20C
```

Sepolia constants:

| Name | Address |
| --- | --- |
| InterFold | `0x3E856E24c7a95d0e04d387f847DA6FA9f6F6c20C` |
| RISC0 router | `0x925d8331ddc0a1F0d96E68CF073DFE1d92b69187` |
| PoseidonT3 | `0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93` |

## 1. Scaffold the guest (ImageID)

```bash
# example: new project next to survey
interfold init my-app-e3
# implement guest logic (what RISC Zero proves at verify time)
# then:
GUEST_DIR=~/my-app-e3 ./scripts/compile-guest.sh
# or copy the script and point ROOT/GUEST_DIR at the new repo
```

Copy generated `ImageID.sol` into `contracts/ImageID.sol` of the program repo.

## 2. Write the Solidity E3 program

Mirror `contracts/SurveyProgram.sol`:

1. `publishInput` — decode proof + app fields → build `bytes32[] publicInputs` → `inputVerifier.verify`
2. Store ciphertext / commitment in a LazyIMT (or your structure)
3. `verify` — decode RISC Zero seal/journal → `risc0Verifier.verify(seal, imageId, journalDigest)`

Match public-input order to the Noir circuit exactly.

## 3. Write + compile the Noir circuit (Honk)

```bash
# CIRCUIT_DIR=path/to/your_circuit ./scripts/compile-circuits.sh
```

Rules that burned us:

- **nargo `v1.0.0-beta.26` only** with bb 5.1 (older nargo → ACIR format mismatch)
- Keep the generated Honk `.sol` under `generated/verifiers/`, **not** in the same forge `src` as the program when `via_ir=true` (stack-too-deep)
- Deploy Honk in an isolated forge project with **`via_ir=false`** so libraries (`RelationsLib`, `ZKTranscriptLib`) link correctly (`forge script`, not bare `forge create`)

## 4. Deploy

```bash
./scripts/deploy-program.sh
```

Order:

1. Deploy HonkVerifier (+ libs)
2. Deploy Program`(interfold, risc0Router, honk, imageId)` linking PoseidonT3

Addresses land in `deployments/survey-program.env` (rename for the new app).

## 5. Verify on explorers

```bash
./scripts/verify-program.sh
```

Verify **your** program + Honk (+ Honk libs).  
**Do not** verify the RISC Zero router — it is not your contract.

## 6. Wire the frontend

- Set `VITE_E3_PROGRAM_ADDRESS` to the new program
- Encode `publishInput` the same way the Solidity expects
- Eventually generate real Honk proofs client-side (empty proofs fail against a real Honk verifier)

## 7. Submit for whitelist

Ask InterFold to register the **program** address. Template: `docs/SUBMIT-PROGRAM.md`.

Disclose honesty:

- guest ImageID (real vs template)
- Honk circuit maturity (range-only vs full encryption circuit)
- RISC0 = official router

## Checklist for a new program

- [ ] Guest compiled in Docker → new ImageID
- [ ] Noir circuit matches on-chain public inputs
- [ ] Honk verifier deployed + Etherscan verified
- [ ] Program deployed with `(interfold, risc0Router, honk, imageId)`
- [ ] Poseidon linked (not redeployed)
- [ ] Program verified on Etherscan/Sourcify
- [ ] Frontend env updated
- [ ] Whitelist message sent with Etherscan links

## Common failures

| Symptom | Fix |
| --- | --- |
| bb rejects ACIR / msgpack | Pin nargo **beta.26** |
| Yul stack-too-deep on Honk | Isolate Honk, `via_ir=false` |
| Poseidon deploy OOG / size | Link `0x3333…3B93` |
| `publishInput` reverts proof | Real Honk needs a real proof |
| E3 create fails “program not registered” | Wait for InterFold whitelist |

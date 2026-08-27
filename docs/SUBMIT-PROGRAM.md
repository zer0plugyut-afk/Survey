# Submit SurveyProgram to InterFold (Sepolia)

## Live stack (insecure-512 + review fixes)

| Field | Value |
| --- | --- |
| **SurveyProgram** | [`0x7e7Fe6c3216897A619D2e7aD0D3136B0f4d11833`](https://sepolia.etherscan.io/address/0x7e7Fe6c3216897A619D2e7aD0D3136B0f4d11833) |
| **Honk (survey_fold)** | [`0x4C1E70E22BaFcF0B1B96F127333aE7eEbe23988A`](https://sepolia.etherscan.io/address/0x4C1E70E22BaFcF0B1B96F127333aE7eEbe23988A) |
| **ImageID** | `0xfee29cd903a15e5752c68fb64c019f0ff5fb7a5f31e533dc5ca38dd4162c0c1e` |
| **RISC Zero** | `0x925d8331ddc0a1F0d96E68CF073DFE1d92b69187` (official Sepolia router) |
| **BFV** | `INSECURE_THRESHOLD_512` / `paramSet: 0` |

### Review fixes in this deploy

- `validate` — InterFold only (no owner path)
- `publishInput` — `respondent` must equal `msg.sender`
- Event emits full **ciphertext** (not just commitment)
- Uses `IInterfold` / `E3` from `@interfold/contracts`

### Short message

Hey — updated SurveyProgram after your review (Sepolia insecure-512):

`0x7e7Fe6c3216897A619D2e7aD0D3136B0f4d11833`

- ImageID: `0xfee29cd903a15e5752c68fb64c019f0ff5fb7a5f31e533dc5ca38dd4162c0c1e`
- Honk (survey_fold): `0x4C1E70E22BaFcF0B1B96F127333aE7eEbe23988A`
- BFV: INSECURE_THRESHOLD_512 (paramSet 0)
- RISC0: official Sepolia router

Please whitelist this program address.

### Prior (superseded)

| Note | Address |
| --- | --- |
| insecure-512 pre-review | `0x3D99a6D49688d44dA45E3F026e17a188F3966E03` |
| secure-8192 SurveyProgram | `0x56b8B7B7a35ED3b25a7D255Bf59e552f9B67aEDC` |
| secure-8192 Honk | `0xcA046bfC286b6e529fA0B43705742d53BA327D49` |

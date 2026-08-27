# Education survey UI (Sepolia)

React + Vite app for the InterFold education survey (create / respond / submit).

## Run

```bash
cd web
pnpm install
pnpm dev
```

Open http://localhost:5173

## Routes

| Path | Role |
| --- | --- |
| `/` | Home |
| `/create` | Researcher flow |
| `/respond` | Respondent flow |
| `/submit` | Whitelist checklist |

## Env

Copy `.env.example` → `.env.local`:

- `VITE_SEPOLIA_RPC_URL`
- `VITE_E3_PROGRAM_ADDRESS` — current: `0x38CFb6082Fb2AC4c2db73815abdfDC16a75BF191`

Defaults also live in `src/config/sepolia.ts`.

## Repo docs

- Root overview: [`../README.md`](../README.md)
- Next-contract playbook: [`../docs/STEPS.md`](../docs/STEPS.md)
- Whitelist message: [`../docs/SUBMIT-PROGRAM.md`](../docs/SUBMIT-PROGRAM.md)

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_E3_PROGRAM_ADDRESS?: string
  readonly VITE_RPC_URL?: string
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

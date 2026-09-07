/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_E3_PROGRAM_ADDRESS?: string
  readonly VITE_SURVEY_ADMIN_ADDRESS?: string
  readonly VITE_RPC_URL?: string
  readonly VITE_SEPOLIA_RPC_URL?: string
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

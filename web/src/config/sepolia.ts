/** Sepolia InterFold — docs.theinterfold.com deploy-to-testnet */

function toHttpRpcUrl(url: string): string {
  if (url.startsWith('ws://')) return `http://${url.slice(5)}`
  if (url.startsWith('wss://')) return `https://${url.slice(6)}`
  return url
}

const e3FromEnv = import.meta.env.VITE_E3_PROGRAM_ADDRESS as `0x${string}` | undefined
const adminFromEnv = import.meta.env.VITE_SURVEY_ADMIN_ADDRESS as `0x${string}` | undefined

/** Only this wallet may open Create survey (demo / v1). Override with VITE_SURVEY_ADMIN_ADDRESS. */
export const SURVEY_ADMIN_ADDRESS = (
  adminFromEnv || '0xf2fa17aaba2a45dc1184bf212c7aa3b923f36bc9'
).toLowerCase() as `0x${string}`

export function isSurveyAdmin(address?: string | null): boolean {
  if (!address) return false
  return address.toLowerCase() === SURVEY_ADMIN_ADDRESS
}

export const SEPOLIA = {
  chainId: 11155111,
  name: 'Sepolia',
  explorer: 'https://sepolia.etherscan.io',
  rpcUrl: toHttpRpcUrl(
    import.meta.env.VITE_SEPOLIA_RPC_URL ||
      import.meta.env.VITE_RPC_URL ||
      'https://ethereum-sepolia-rpc.publicnode.com',
  ),
  /** Mainnet RPC only for ConnectKit ENS lookups (not used for InterFold txs). */
  mainnetRpcUrl: toHttpRpcUrl(
    import.meta.env.VITE_MAINNET_RPC_URL || 'https://ethereum-rpc.publicnode.com',
  ),
  /**
   * Sepolia (official SDK): INSECURE_THRESHOLD_512 ↔ paramSet 0.
   * Must match web/src/circuits/PRESET.txt and deployed Honk + SurveyProgram.
   */
  thresholdBfvParamsPresetName: 'INSECURE_THRESHOLD_512' as const,
  /** On-chain BFV index — must match thresholdBfvParamsPresetName and compiled circuits. */
  paramSet: 0 as const,
  faucet: '0x6e281411C055BEEbD74bDFcB9aB095aa98907F85' as const,
  foldToken: '0x9752444A6a955D420402EaFf5f818afCddb9c340' as const,
  contracts: {
    interfold: '0x3E856E24c7a95d0e04d387f847DA6FA9f6F6c20C' as const,
    ciphernodeRegistry: '0x374F4542eC634d5437Dd65020781A9D9Df9c2AB8' as const,
    feeToken: '0xC35B783cA97710be47Fc81D10dADc895EfcD865c' as const,
    /** Live SurveyProgram (insecure-512, up to 20 questions) — override with VITE_E3_PROGRAM_ADDRESS */
    e3Program: (e3FromEnv ||
      '0x15d0cdD27A1D7cf5488CC74470bEe26Cc6c6955a') as `0x${string}`,
  },
}

export function shortAddr(addr?: string) {
  if (!addr || /^0x0+$/.test(addr)) return '—'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

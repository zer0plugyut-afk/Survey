import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider, getDefaultConfig } from 'connectkit'
import { ReactNode } from 'react'
import { SEPOLIA } from '../config/sepolia'

// ConnectKit still touches mainnet for ENS; pin both RPCs so wagmi never falls back to eth.merkle.io.
const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'InterFold Education Survey',
    enableFamily: false,
    chains: [sepolia],
    transports: {
      [sepolia.id]: http(SEPOLIA.rpcUrl),
      [mainnet.id]: http(SEPOLIA.mainnetRpcUrl),
    },
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '00000000000000000000000000000000',
  }),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          options={{ initialChainId: sepolia.id }}
          mode="dark"
        >
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

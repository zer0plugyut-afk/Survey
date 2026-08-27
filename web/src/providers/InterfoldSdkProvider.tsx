import { createContext, useContext, useMemo, ReactNode } from 'react'
import { useInterfoldSDK, UseInterfoldSDKReturn } from '@interfold/react'
import type { ThresholdBfvParamsPresetName } from '@interfold/sdk'
import { SEPOLIA } from '../config/sepolia'

const SdkContext = createContext<UseInterfoldSDKReturn | null>(null)

export function InterfoldSdkProvider({ children }: { children: ReactNode }) {
  const config = useMemo(
    () => ({
      autoConnect: true,
      contracts: {
        interfold: SEPOLIA.contracts.interfold,
        ciphernodeRegistry: SEPOLIA.contracts.ciphernodeRegistry,
        feeToken: SEPOLIA.contracts.feeToken,
      },
      thresholdBfvParamsPresetName: SEPOLIA.thresholdBfvParamsPresetName as ThresholdBfvParamsPresetName,
    }),
    [],
  )
  const sdk = useInterfoldSDK(config)
  return <SdkContext.Provider value={sdk}>{children}</SdkContext.Provider>
}

export function useSurveySdk() {
  const ctx = useContext(SdkContext)
  if (!ctx) throw new Error('useSurveySdk must be used within InterfoldSdkProvider')
  return ctx
}

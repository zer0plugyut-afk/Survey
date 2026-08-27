import { SEPOLIA } from '../config/sepolia'

export const SURVEY_PROGRAM_ABI = [
  {
    type: 'function',
    name: 'rounds',
    stateMutability: 'view',
    inputs: [{ name: 'e3Id', type: 'uint256' }],
    outputs: [
      { name: 'schemaHash', type: 'bytes32' },
      { name: 'inputCount', type: 'uint64' },
      { name: 'initialized', type: 'bool' },
    ],
  },
] as const

type ReadableClient = {
  readContract: (args: {
    address: `0x${string}`
    abi: typeof SURVEY_PROGRAM_ABI
    functionName: 'rounds'
    args: [bigint]
  }) => Promise<readonly [string, bigint, boolean]>
}

export async function readSurveyInputCount(publicClient: ReadableClient, e3Id: bigint): Promise<number> {
  const row = await publicClient.readContract({
    address: SEPOLIA.contracts.e3Program,
    abi: SURVEY_PROGRAM_ABI,
    functionName: 'rounds',
    args: [e3Id],
  })
  return Number(row[1])
}

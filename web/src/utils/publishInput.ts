import { encodeAbiParameters, hexToBytes, type WalletClient } from 'viem'
import { SEPOLIA } from '../config/sepolia'
import type { SurveyQuestion } from '../data/questions'
import { SCHEMA_ID, allowedRangeForKind } from './surveySchema'

const SURVEY_ABI = [
  {
    type: 'function',
    name: 'publishInput',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'e3Id', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
  },
] as const

function toHex(bytes: Uint8Array): `0x${string}` {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Encode SurveyProgram.publishInput payload.
 * Layout: (bytes proof, address respondent, uint256 questionIndex,
 *          uint256 minValue, uint256 maxValue, bytes32 commitment, bytes ciphertext)
 */
export function encodePublishInputData(args: {
  proof: `0x${string}`
  respondent: `0x${string}`
  questionIndex: number
  minValue: bigint
  maxValue: bigint
  commitment: `0x${string}` | Uint8Array
  ciphertext: `0x${string}` | Uint8Array
}): `0x${string}` {
  if (!args.proof || args.proof === '0x') {
    throw new Error('publishInput requires a survey_fold Honk proof (empty proof rejected)')
  }
  const commitment =
    typeof args.commitment === 'string' ? args.commitment : toHex(args.commitment)
  const ciphertext =
    typeof args.ciphertext === 'string' ? args.ciphertext : toHex(args.ciphertext)

  return encodeAbiParameters(
    [
      { type: 'bytes' },
      { type: 'address' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'bytes32' },
      { type: 'bytes' },
    ],
    [
      args.proof,
      args.respondent,
      BigInt(args.questionIndex),
      args.minValue,
      args.maxValue,
      commitment,
      ciphertext,
    ],
  )
}

/** Public inputs SurveyProgram builds on-chain (must match survey_fold pubs + return). */
export function buildSurveyPublicInputs(args: {
  respondent: `0x${string}`
  questionIndex: number
  kind: SurveyQuestion['kind']
  commitment: `0x${string}`
  committeePublicKey: `0x${string}`
}): `0x${string}`[] {
  const [min, max] = allowedRangeForKind(args.kind)
  return [
    SCHEMA_ID,
    `0x${args.respondent.slice(2).padStart(64, '0')}` as `0x${string}`,
    `0x${args.questionIndex.toString(16).padStart(64, '0')}` as `0x${string}`,
    `0x${min.toString(16).padStart(64, '0')}` as `0x${string}`,
    `0x${max.toString(16).padStart(64, '0')}` as `0x${string}`,
    args.commitment,
    args.committeePublicKey,
  ]
}

export async function publishEncryptedAnswer(
  walletClient: WalletClient,
  account: `0x${string}`,
  e3Id: bigint,
  ciphertext: Uint8Array,
  commitment: Uint8Array,
  opts: {
    questionIndex: number
    kind: SurveyQuestion['kind']
    /** Required survey_fold Honk proof (keccak / EVM). */
    proof: `0x${string}`
  },
) {
  const [minValue, maxValue] = allowedRangeForKind(opts.kind)
  const data = encodePublishInputData({
    proof: opts.proof,
    respondent: account,
    questionIndex: opts.questionIndex,
    minValue,
    maxValue,
    commitment,
    ciphertext,
  })

  return walletClient.writeContract({
    address: SEPOLIA.contracts.e3Program,
    abi: SURVEY_ABI,
    functionName: 'publishInput',
    args: [e3Id, data],
    account,
    chain: walletClient.chain,
  })
}

export { hexToBytes, toHex }

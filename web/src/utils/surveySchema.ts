import { keccak256, toBytes, pad } from 'viem'

/** Must match SurveyProgram.SCHEMA_ID = keccak256("education-survey-v1") */
export const SCHEMA_ID = keccak256(toBytes('education-survey-v1'))

export function allowedRange(questionIndex: number): [bigint, bigint] {
  if (questionIndex < 0 || questionIndex > 4) throw new Error('Invalid question index')
  if (questionIndex === 4) return [0n, 1n]
  return [1n, 5n]
}

export function bytes32FromAddress(addr: `0x${string}`): `0x${string}` {
  return pad(addr, { size: 32 })
}

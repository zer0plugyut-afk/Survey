import { keccak256, toBytes, pad } from 'viem'
import type { SurveyQuestion } from '../data/questions'

/** Must match SurveyProgram.SCHEMA_ID = keccak256("education-survey-v1") */
export const SCHEMA_ID = keccak256(toBytes('education-survey-v1'))

export function allowedRangeForKind(kind: SurveyQuestion['kind']): [bigint, bigint] {
  if (kind === 'yesno') return [0n, 1n]
  return [1n, 5n]
}

/** @deprecated Prefer `allowedRangeForKind` — range follows question type, not index. */
export function allowedRange(questionIndex: number, kind: SurveyQuestion['kind'] = 'likert'): [bigint, bigint] {
  if (questionIndex < 0 || questionIndex >= 20) throw new Error('Invalid question index')
  return allowedRangeForKind(kind)
}

export function bytes32FromAddress(addr: `0x${string}`): `0x${string}` {
  return pad(addr, { size: 32 })
}

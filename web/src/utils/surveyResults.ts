import { decodePlaintextOutput } from '@interfold/sdk'
import { SURVEY_QUESTIONS } from '../data/questions'

const QUESTIONS_PER_RESPONSE = SURVEY_QUESTIONS.length

export type SurveyAggregates = {
  plaintextHex: string | null
  aggregateSum: number | null
  inputCount: number | null
  estimatedRespondents: number | null
  meanAnswer: number | null
}

export function decodeAggregate(plaintextOutput: string | null | undefined): number | null {
  if (!plaintextOutput || plaintextOutput === '0x' || plaintextOutput === '0x0') return null
  return decodePlaintextOutput(plaintextOutput)
}

/**
 * InterFold BFV demo compute decrypts one u64: the sum of all published encrypted integers.
 * Each respondent publishes one ciphertext per question (5), so respondents ≈ inputCount / 5.
 */
export function buildAggregates(opts: {
  plaintextOutput?: string | null
  inputCount?: number | null
}): SurveyAggregates {
  const aggregateSum = decodeAggregate(opts.plaintextOutput ?? null)
  const inputCount = opts.inputCount ?? null
  const estimatedRespondents =
    inputCount != null && inputCount > 0 ? Math.floor(inputCount / QUESTIONS_PER_RESPONSE) : null
  const meanAnswer =
    aggregateSum != null && inputCount != null && inputCount > 0 ? aggregateSum / inputCount : null

  return {
    plaintextHex: opts.plaintextOutput ?? null,
    aggregateSum,
    inputCount,
    estimatedRespondents,
    meanAnswer,
  }
}

export { QUESTIONS_PER_RESPONSE }

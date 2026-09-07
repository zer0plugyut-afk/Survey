import { SURVEY_QUESTIONS } from '../data/questions'
import { decodeSurveyTally, QUESTION_COUNT } from './surveyEncoding'

const QUESTIONS_PER_RESPONSE = QUESTION_COUNT

export type QuestionTally = {
  index: number
  id: string
  prompt: string
  kind: 'likert' | 'yesno'
  sum: number | null
  mean: number | null
}

export type SurveyAggregates = {
  plaintextHex: string | null
  /** Per-question tallies from CRISP-style decode. */
  questionTallies: QuestionTally[]
  /** Sum of all question tallies (convenience). */
  aggregateSum: number | null
  inputCount: number | null
  estimatedRespondents: number | null
  meanAnswer: number | null
}

/**
 * Decode committee plaintext into per-question sums (CRISP decodeTally layout).
 * Falls back to null tallies if bytes are too short / wrong shape.
 */
export function decodePerQuestion(
  plaintextOutput: string | null | undefined,
): bigint[] | null {
  if (!plaintextOutput || plaintextOutput === '0x' || plaintextOutput === '0x0') return null
  try {
    return decodeSurveyTally(plaintextOutput, QUESTIONS_PER_RESPONSE)
  } catch {
    return null
  }
}

/**
 * InterFold BFV compute still sum-alls ciphertexts. With CRISP packing, each CT carries
 * the answer in one question segment, so the decrypted poly yields one total per question.
 */
export function buildAggregates(opts: {
  plaintextOutput?: string | null
  inputCount?: number | null
}): SurveyAggregates {
  const inputCount = opts.inputCount ?? null
  const estimatedRespondents =
    inputCount != null && inputCount > 0 ? Math.floor(inputCount / QUESTIONS_PER_RESPONSE) : null

  const tallies = decodePerQuestion(opts.plaintextOutput ?? null)
  const questionTallies: QuestionTally[] = SURVEY_QUESTIONS.map((q, index) => {
    const sumBi = tallies?.[index] ?? null
    const sum = sumBi != null ? Number(sumBi) : null
    const mean =
      sum != null && estimatedRespondents != null && estimatedRespondents > 0
        ? sum / estimatedRespondents
        : null
    return {
      index,
      id: q.id,
      prompt: q.prompt,
      kind: q.kind,
      sum,
      mean,
    }
  })

  const aggregateSum =
    tallies != null ? tallies.reduce((a, b) => a + Number(b), 0) : null
  const meanAnswer =
    aggregateSum != null && inputCount != null && inputCount > 0
      ? aggregateSum / inputCount
      : null

  return {
    plaintextHex: opts.plaintextOutput ?? null,
    questionTallies,
    aggregateSum,
    inputCount,
    estimatedRespondents,
    meanAnswer,
  }
}

export { QUESTIONS_PER_RESPONSE }

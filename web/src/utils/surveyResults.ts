import type { SurveyQuestion } from '../data/questions'
import { decodeSurveyTally, QUESTION_COUNT as PACKING_SLOTS } from './surveyEncoding'

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
  questionTallies: QuestionTally[]
  aggregateSum: number | null
  inputCount: number | null
  estimatedRespondents: number | null
  meanAnswer: number | null
}

export function decodePerQuestion(
  plaintextOutput: string | null | undefined,
  visibleCount: number = PACKING_SLOTS,
): bigint[] | null {
  if (!plaintextOutput || plaintextOutput === '0x' || plaintextOutput === '0x0') return null
  try {
    return decodeSurveyTally(plaintextOutput, visibleCount)
  } catch {
    return null
  }
}

/**
 * InterFold BFV compute sum-alls ciphertexts. With CRISP packing, each CT carries
 * the answer in one packing slot, so decrypt yields one total per slot.
 */
export function buildAggregates(opts: {
  plaintextOutput?: string | null
  inputCount?: number | null
  questions: SurveyQuestion[]
}): SurveyAggregates {
  const questions = opts.questions
  const perResponse = questions.length
  const inputCount = opts.inputCount ?? null
  const estimatedRespondents =
    inputCount != null && inputCount > 0 && perResponse > 0
      ? Math.floor(inputCount / perResponse)
      : null

  const tallies = decodePerQuestion(opts.plaintextOutput ?? null, Math.max(perResponse, 2))
  const questionTallies: QuestionTally[] = questions.map((q, index) => {
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

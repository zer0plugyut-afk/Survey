/**
 * CRISP-style survey plaintext packing.
 *
 * Mirrors InterFold CRISP:
 * - docs.theinterfold.com/CRISP/introduction (encode ballot → FHE sum → decodeTally)
 * - examples/CRISP/packages/crisp-sdk/src/encoding.ts (`encodeVote` / `decodeTally`)
 *
 * Layout: first MAX_MSG_NON_ZERO_COEFFS coeffs hold binary segments (one per question),
 * MSB-first per segment, then zero-pad to BFV degree. After sum-all + decrypt, decode
 * yields one total per question.
 */
import { hexToBytes, type Hex } from 'viem'
import { SURVEY_QUESTIONS } from '../data/questions'

/** Must stay aligned with InterFold / CRISP `MAX_MSG_NON_ZERO_COEFFS`. */
export const MAX_MSG_NON_ZERO_COEFFS = 100

export const QUESTION_COUNT = SURVEY_QUESTIONS.length

export function segmentSize(numQuestions: number = QUESTION_COUNT): number {
  return Math.floor(MAX_MSG_NON_ZERO_COEFFS / numQuestions)
}

export function maxEncodableValue(numQuestions: number = QUESTION_COUNT): number {
  return 2 ** segmentSize(numQuestions) - 1
}

function toBinary(value: number): string {
  if (value < 0) throw new Error('Value cannot be negative')
  return value.toString(2)
}

/**
 * Encode one survey answer as a sparse CRISP ballot vector (length = BFV degree).
 * Only `questionIndex` is non-zero; other question segments are zero.
 */
export function encodeSurveyAnswer(args: {
  questionIndex: number
  answer: number | bigint
  degree: number
  numQuestions?: number
}): BigUint64Array {
  const numQuestions = args.numQuestions ?? QUESTION_COUNT
  const questionIndex = args.questionIndex
  const answer = Number(args.answer)
  const { degree } = args

  if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= numQuestions) {
    throw new Error(`questionIndex ${questionIndex} out of range for ${numQuestions} questions`)
  }
  if (degree < MAX_MSG_NON_ZERO_COEFFS) {
    throw new Error(`BFV degree (${degree}) must be >= MAX_MSG_NON_ZERO_COEFFS (${MAX_MSG_NON_ZERO_COEFFS})`)
  }

  const seg = segmentSize(numQuestions)
  const maxValue = maxEncodableValue(numQuestions)
  if (answer < 0 || answer > maxValue) {
    throw new Error(`Answer ${answer} exceeds max encodable ${maxValue}`)
  }

  const vote: number[] = []
  for (let q = 0; q < numQuestions; q++) {
    const value = q === questionIndex ? answer : 0
    const binary = toBinary(value).split('')
    for (let i = 0; i < seg; i++) {
      const offset = seg - binary.length
      vote.push(i < offset ? 0 : Number.parseInt(binary[i - offset]!, 10))
    }
  }

  const used = seg * numQuestions
  for (let i = used; i < MAX_MSG_NON_ZERO_COEFFS; i++) vote.push(0)
  for (let i = 0; i < degree - MAX_MSG_NON_ZERO_COEFFS; i++) vote.push(0)

  return BigUint64Array.from(vote.map((n) => BigInt(n)))
}

/** Little-endian u64 coefficients from plaintext output bytes (CRISP decodeBytesToBigInts). */
export function decodeBytesToBigInts(data: Uint8Array): bigint[] {
  if (data.length % 8 !== 0) {
    throw new Error('Plaintext length must be a multiple of 8')
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const out: bigint[] = []
  for (let i = 0; i < data.length / 8; i++) {
    out.push(view.getBigUint64(i * 8, true))
  }
  return out
}

/**
 * Decode committee plaintext into per-question tallies (CRISP `decodeTally`).
 */
export function decodeSurveyTally(
  plaintext: string | number[] | bigint[],
  numQuestions: number = QUESTION_COUNT,
): bigint[] {
  if (!Number.isInteger(numQuestions) || numQuestions < 2) {
    throw new Error(`numQuestions must be an integer >= 2 (got ${numQuestions})`)
  }

  let coefficients: bigint[]
  if (typeof plaintext === 'string') {
    const hex = (plaintext.startsWith('0x') ? plaintext : `0x${plaintext}`) as Hex
    coefficients = decodeBytesToBigInts(hexToBytes(hex))
  } else {
    coefficients = plaintext.map(BigInt)
  }

  if (coefficients.length < MAX_MSG_NON_ZERO_COEFFS) {
    throw new Error(
      `decoded coefficient count (${coefficients.length}) < MAX_MSG_NON_ZERO_COEFFS (${MAX_MSG_NON_ZERO_COEFFS})`,
    )
  }

  const seg = segmentSize(numQuestions)
  const results: bigint[] = []
  for (let q = 0; q < numQuestions; q++) {
    const start = q * seg
    let value = 0n
    for (let i = 0; i < seg; i++) {
      value += coefficients[start + i]! << BigInt(seg - 1 - i)
    }
    results.push(value)
  }
  return results
}

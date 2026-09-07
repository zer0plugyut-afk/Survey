export type SurveyQuestion =
  | { id: string; prompt: string; hint?: string; kind: 'likert' }
  | { id: string; prompt: string; hint?: string; kind: 'yesno' }

/** Must stay aligned with on-chain SCHEMA_ID = keccak256("education-survey-v1") */
export const SCHEMA_VERSION = 'education-survey-v1'

/**
 * Fixed CRISP packing / circuit width (must match SurveyProgram.QUESTION_COUNT).
 * Creators pick 2–MAX_SURVEY_QUESTIONS prompts; unused packing slots stay zero.
 */
export const PACKING_QUESTION_COUNT = 20
export const MIN_SURVEY_QUESTIONS = 2
export const MAX_SURVEY_QUESTIONS = PACKING_QUESTION_COUNT

/** Empty editor rows for the create form (default 8). */
export function blankQuestions(count: number = 8): SurveyQuestion[] {
  const n = Math.min(MAX_SURVEY_QUESTIONS, Math.max(MIN_SURVEY_QUESTIONS, count))
  return Array.from({ length: n }, (_, i) => ({
    id: `q${i + 1}`,
    prompt: '',
    hint: '1 = low · 5 = high',
    kind: 'likert' as const,
  }))
}

function isValidQuestionCount(n: number): boolean {
  return Number.isInteger(n) && n >= MIN_SURVEY_QUESTIONS && n <= MAX_SURVEY_QUESTIONS
}

/** Questions from a stored survey row (required for respond). */
export function resolveSurveyQuestions(stored?: {
  questions?: SurveyQuestion[]
}): SurveyQuestion[] {
  if (stored?.questions && isValidQuestionCount(stored.questions.length)) {
    return stored.questions.map((q) => ({ ...q }))
  }
  return []
}

export function questionsReady(questions: SurveyQuestion[]): boolean {
  return isValidQuestionCount(questions.length) && questions.every((q) => q.prompt.trim().length > 0)
}

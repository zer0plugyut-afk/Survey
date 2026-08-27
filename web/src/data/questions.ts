export type SurveyQuestion =
  | { id: string; prompt: string; hint?: string; kind: 'likert' }
  | { id: string; prompt: string; hint?: string; kind: 'yesno' }

/** Must stay aligned with on-chain SCHEMA_ID = keccak256("education-survey-v1") */
export const SCHEMA_VERSION = 'education-survey-v1'

/** V1 education schema — integer answers only (FHE-friendly). */
export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'satisfaction',
    prompt: 'Overall, how satisfied are you with this course?',
    hint: '1 = very dissatisfied · 5 = very satisfied',
    kind: 'likert',
  },
  {
    id: 'clarity',
    prompt: 'How clear were the learning objectives and materials?',
    hint: '1 = unclear · 5 = very clear',
    kind: 'likert',
  },
  {
    id: 'workload',
    prompt: 'How manageable was the workload?',
    hint: '1 = unmanageable · 5 = very manageable',
    kind: 'likert',
  },
  {
    id: 'support',
    prompt: 'How supported did you feel by instructors / TAs?',
    hint: '1 = unsupported · 5 = very supported',
    kind: 'likert',
  },
  {
    id: 'recommend',
    prompt: 'Would you recommend this course to a peer?',
    hint: 'Yes = 1 · No = 0',
    kind: 'yesno',
  },
]

export function blankCustomQuestions(): SurveyQuestion[] {
  return Array.from({ length: 5 }, (_, i) => ({
    id: `q${i + 1}`,
    prompt: '',
    hint: i === 4 ? 'Yes = 1 · No = 0' : '1 = low · 5 = high',
    kind: (i === 4 ? 'yesno' : 'likert') as SurveyQuestion['kind'],
  }))
}

export function cloneDraftQuestions(): SurveyQuestion[] {
  return SURVEY_QUESTIONS.map((q) => ({ ...q }))
}

/** Prefer stored custom prompts; otherwise the built-in draft schema. */
export function resolveSurveyQuestions(stored?: {
  questionSource?: 'draft' | 'custom'
  questions?: SurveyQuestion[]
}): SurveyQuestion[] {
  if (stored?.questionSource === 'custom' && stored.questions?.length === 5) {
    return stored.questions.map((q) => ({ ...q }))
  }
  return cloneDraftQuestions()
}

export function customQuestionsReady(questions: SurveyQuestion[]): boolean {
  return questions.length === 5 && questions.every((q) => q.prompt.trim().length > 0)
}

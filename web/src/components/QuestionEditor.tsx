import {
  MAX_SURVEY_QUESTIONS,
  MIN_SURVEY_QUESTIONS,
  type SurveyQuestion,
} from '../data/questions'
import { SoftSelect } from './SoftSelect'

type Props = {
  questions: SurveyQuestion[]
  onChange: (next: SurveyQuestion[]) => void
}

export function QuestionEditor({ questions, onChange }: Props) {
  const update = (index: number, patch: Partial<SurveyQuestion>) => {
    onChange(
      questions.map((q, i) => {
        if (i !== index) return q
        const kind = patch.kind ?? q.kind
        const next = { ...q, ...patch, kind } as SurveyQuestion
        if (kind === 'yesno' && !patch.hint && q.kind !== 'yesno') {
          next.hint = 'Yes = 1 · No = 0'
        }
        if (kind === 'likert' && !patch.hint && q.kind !== 'likert') {
          next.hint = '1 = low · 5 = high'
        }
        return next
      }),
    )
  }

  const addQuestion = () => {
    if (questions.length >= MAX_SURVEY_QUESTIONS) return
    const n = questions.length + 1
    onChange([
      ...questions,
      {
        id: `q${n}-${Date.now()}`,
        prompt: '',
        hint: '1 = low · 5 = high',
        kind: 'likert',
      },
    ])
  }

  const removeQuestion = (index: number) => {
    if (questions.length <= MIN_SURVEY_QUESTIONS) return
    onChange(questions.filter((_, i) => i !== index))
  }

  return (
    <div className="q-editor">
      <p className="q-editor__note">
        Add <strong>{MIN_SURVEY_QUESTIONS}–{MAX_SURVEY_QUESTIONS}</strong> integer questions
        (Likert 1–5 or yes/no). Packing uses a fixed {MAX_SURVEY_QUESTIONS}-slot circuit layout —
        unused slots stay zero.
      </p>
      {questions.map((q, index) => (
        <div className="q-editor__card" key={q.id}>
          <div className="q-editor__head">
            <span>Question {index + 1}</span>
            <div className="q-editor__head-actions">
              <SoftSelect
                aria-label={`Type for question ${index + 1}`}
                value={q.kind}
                options={[
                  { value: 'likert', label: 'Likert 1–5' },
                  { value: 'yesno', label: 'Yes / no' },
                ]}
                onChange={(kind) => update(index, { kind })}
              />
              <button
                type="button"
                className="btn btn--ghost"
                disabled={questions.length <= MIN_SURVEY_QUESTIONS}
                onClick={() => removeQuestion(index)}
                aria-label={`Remove question ${index + 1}`}
              >
                Remove
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor={`q-prompt-${q.id}`}>Prompt</label>
            <input
              id={`q-prompt-${q.id}`}
              value={q.prompt}
              onChange={(e) => update(index, { prompt: e.target.value })}
              placeholder="What do you want to ask?"
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor={`q-hint-${q.id}`}>Hint (optional)</label>
            <input
              id={`q-hint-${q.id}`}
              value={q.hint ?? ''}
              onChange={(e) => update(index, { hint: e.target.value || undefined })}
              placeholder="Shown under the question"
            />
          </div>
        </div>
      ))}
      <div className="q-editor__footer">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={questions.length >= MAX_SURVEY_QUESTIONS}
          onClick={addQuestion}
        >
          Add question ({questions.length}/{MAX_SURVEY_QUESTIONS})
        </button>
      </div>
    </div>
  )
}

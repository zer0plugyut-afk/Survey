import { SurveyQuestion } from '../data/questions'
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

  return (
    <div className="q-editor">
      <p className="q-editor__note">
        Keep <strong>5 integer questions</strong> (Likert 1–5 or yes/no). That matches the live SurveyProgram input
        layout on Sepolia.
      </p>
      {questions.map((q, index) => (
        <div className="q-editor__card" key={q.id}>
          <div className="q-editor__head">
            <span>Question {index + 1}</span>
            <SoftSelect
              aria-label={`Type for question ${index + 1}`}
              value={q.kind}
              options={[
                { value: 'likert', label: 'Likert 1–5' },
                { value: 'yesno', label: 'Yes / no' },
              ]}
              onChange={(kind) => update(index, { kind })}
            />
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
    </div>
  )
}

import type { SurveyQuestion } from '../data/questions'

type Answers = Record<string, number | null>

type Props = {
  answers: Answers
  onChange: (id: string, value: number) => void
  questions: SurveyQuestion[]
}

function QuestionBlock({
  q,
  value,
  onChange,
}: {
  q: SurveyQuestion
  value: number | null
  onChange: (v: number) => void
}) {
  return (
    <div className="question">
      <div className="question__meta">
        <span>{q.id}</span>
        <span>{q.kind === 'likert' ? 'Likert 1–5' : 'Yes / no'}</span>
      </div>
      <strong>{q.prompt}</strong>
      {q.hint ? <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{q.hint}</span> : null}
      {q.kind === 'likert' ? (
        <div className="likert" role="group" aria-label={q.prompt}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`choice${value === n ? ' is-selected' : ''}`}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
      ) : (
        <div className="yn" role="group" aria-label={q.prompt}>
          <button
            type="button"
            className={`choice${value === 1 ? ' is-selected' : ''}`}
            onClick={() => onChange(1)}
          >
            Yes
          </button>
          <button
            type="button"
            className={`choice${value === 0 ? ' is-selected' : ''}`}
            onClick={() => onChange(0)}
          >
            No
          </button>
        </div>
      )}
    </div>
  )
}

export function QuestionForm({ answers, onChange, questions }: Props) {
  return (
    <div>
      {questions.map((q) => (
        <QuestionBlock
          key={q.id}
          q={q}
          value={answers[q.id] ?? null}
          onChange={(v) => onChange(q.id, v)}
        />
      ))}
    </div>
  )
}

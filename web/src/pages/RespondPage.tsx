import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { RespondFlow } from '../flows/RespondFlow'
import { listRespondableSurveys, type StoredSurvey } from '../storage/surveyDb'

function SurveyPicker({ onOpen }: { onOpen: (e3Id: string) => void }) {
  const [surveys, setSurveys] = useState<StoredSurvey[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSurveys(await listRespondableSurveys())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSurveys([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div className="survey-picker">
      <div className="status-box">
        <strong>Open surveys</strong>
        Pick a round created on this app. Questions load from Supabase; answers still encrypt
        on-chain under the committee key.
      </div>

      {loading ? <p className="note">Loading surveys…</p> : null}
      {error ? <p className="note note--error">{error}</p> : null}

      {!loading && !error && surveys.length === 0 ? (
        <div className="status-box">
          <strong>No live surveys yet</strong>
          <p style={{ margin: '0.5rem 0 0' }}>
            When a researcher creates a survey and gets an e3 id, it appears here. Create one from{' '}
            <Link to="/create">Create survey</Link> after whitelist.
          </p>
        </div>
      ) : null}

      <ul className="survey-picker__list">
        {surveys.map((s) => (
          <li key={s.id}>
            <button type="button" className="survey-picker__card" onClick={() => s.e3Id && onOpen(s.e3Id)}>
              <span className="survey-picker__title">{s.title}</span>
              <span className="survey-picker__meta">
                e3 {s.e3Id} · {s.questions?.length ?? 0} questions · {s.status}
                {s.windowLabel ? ` · ${s.windowLabel}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="actions">
        <button type="button" className="btn btn--ghost" onClick={() => void refresh()} disabled={loading}>
          Refresh
        </button>
      </div>
    </div>
  )
}

export function RespondPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const e3 = params.get('e3')

  if (e3) {
    return (
      <Shell
        title="Respond to survey"
        badge="Respondent · Sepolia"
        lede="Answer on the right. Steps stay linked on the left so you always know where you are in the round."
      >
        <div className="actions" style={{ marginBottom: 12 }}>
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/respond')}>
            ← All surveys
          </button>
        </div>
        <RespondFlow />
      </Shell>
    )
  }

  return (
    <Shell
      title="Respond"
      badge="Respondent · Sepolia"
      lede="Choose a live survey round from Supabase, then encrypt and submit your answers."
    >
      <SurveyPicker
        onOpen={(e3Id) => {
          navigate(`/respond?e3=${encodeURIComponent(e3Id)}`)
        }}
      />
      <p className="note" style={{ marginTop: 16 }}>
        Direct links still work: <span className="mono">/respond?e3=&lt;id&gt;</span>
      </p>
    </Shell>
  )
}

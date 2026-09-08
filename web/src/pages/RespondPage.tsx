import { useCallback, useEffect, useId, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { RespondFlow } from '../flows/RespondFlow'
import {
  GlassIcon,
  SurveyIcons,
  glassAccentStyle,
  glassCoolStyle,
  glassOkStyle,
} from '../components/GlassIcon'
import { listRespondableSurveys, type StoredSurvey } from '../storage/surveyDb'
import {
  IconBookOpen,
  IconClipboardCheck,
  IconLock,
  IconMsgs,
  IconSparkle,
} from 'nucleo-glass'

type CardModel = {
  key: string
  title: string
  status: string
  e3Id: string | null
  questionCount: number
  prompts: string[]
  windowLabel?: string
  preview?: boolean
  tone: 'accent' | 'cool' | 'ok'
}

const PREVIEW_CARDS: CardModel[] = [
  {
    key: 'preview-1',
    title: 'Spring 2026 course feedback',
    status: 'collecting',
    e3Id: '42',
    questionCount: 8,
    prompts: [
      'Overall, how satisfied are you with this course?',
      'How clear were the learning objectives?',
      'Would you recommend this course to a peer?',
    ],
    windowLabel: '48 hours',
    preview: true,
    tone: 'accent',
  },
  {
    key: 'preview-2',
    title: 'Lab module check-in',
    status: 'requested',
    e3Id: '57',
    questionCount: 5,
    prompts: [
      'How manageable was the lab workload?',
      'Did you have adequate access to tools?',
      'How supported did you feel by TAs?',
    ],
    windowLabel: '24 hours',
    preview: true,
    tone: 'cool',
  },
  {
    key: 'preview-3',
    title: 'Guest lecture pulse',
    status: 'complete',
    e3Id: '61',
    questionCount: 4,
    prompts: [
      'How useful was the guest lecture?',
      'Was the pacing clear?',
      'Would you attend another session?',
    ],
    windowLabel: '6 hours',
    preview: true,
    tone: 'ok',
  },
]

function toneStyle(tone: CardModel['tone']) {
  if (tone === 'cool') return glassCoolStyle
  if (tone === 'ok') return glassOkStyle
  return glassAccentStyle
}

function toneIcon(tone: CardModel['tone']) {
  if (tone === 'cool') return IconBookOpen
  if (tone === 'ok') return IconSparkle
  return IconClipboardCheck
}

function toCard(s: StoredSurvey, index: number): CardModel {
  const tones: CardModel['tone'][] = ['accent', 'cool', 'ok']
  return {
    key: s.id,
    title: s.title,
    status: s.status,
    e3Id: s.e3Id,
    questionCount: s.questions?.length ?? 0,
    prompts: (s.questions ?? []).map((q) => q.prompt).filter(Boolean).slice(0, 3),
    windowLabel: s.windowLabel,
    preview: false,
    tone: tones[index % tones.length]!,
  }
}

function SurveyCard({
  card,
  onOpen,
}: {
  card: CardModel
  onOpen?: (e3Id: string) => void
}) {
  const uid = useId().replace(/:/g, '')
  const Icon = toneIcon(card.tone)
  const clickable = Boolean(card.e3Id && !card.preview && onOpen)

  return (
    <li>
      <button
        type="button"
        className={`survey-tile${card.preview ? ' is-preview' : ''}`}
        disabled={!clickable}
        onClick={() => {
          if (clickable && card.e3Id) onOpen?.(card.e3Id)
        }}
      >
        <div className="survey-tile__hero" data-tone={card.tone}>
          <span className="survey-tile__glyph" aria-hidden>
            <Icon size={36} uniqueId={uid} style={toneStyle(card.tone)} />
          </span>
          {card.preview ? (
            <span className="survey-tile__badge">
              <GlassIcon icon={IconLock} size={12} />
              Preview
            </span>
          ) : (
            <span className="survey-tile__badge survey-tile__badge--live">{card.status}</span>
          )}
        </div>

        <div className="survey-tile__body">
          <h3 className="survey-tile__title">{card.title}</h3>
          <p className="survey-tile__meta">
            {card.questionCount} questions
            {card.windowLabel ? ` · ${card.windowLabel}` : ''}
            {card.e3Id ? ` · e3 ${card.e3Id}` : ''}
          </p>
          <ul className="survey-tile__preview">
            {(card.prompts.length ? card.prompts : ['Questions appear here after create']).map(
              (prompt, i) => (
                <li key={`${card.key}-q${i}`}>
                  <GlassIcon icon={SurveyIcons.question} size={14} />
                  <span>{prompt}</span>
                </li>
              ),
            )}
          </ul>
        </div>
      </button>
    </li>
  )
}

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

  const liveCards = surveys.map(toCard)
  const showPreview = !loading && !error && liveCards.length === 0

  return (
    <div className="survey-picker">
      <div className="status-box">
        <strong>Open surveys</strong>
        Square cards preview the first prompts. Live rounds load from Supabase after create + e3 id.
      </div>

      {loading ? <p className="note">Loading surveys…</p> : null}
      {error ? <p className="note note--error">{error}</p> : null}

      {showPreview ? (
        <div className="status-box">
          <strong>Preview layout</strong>
          <p style={{ margin: '0.5rem 0 0' }}>
            No live rounds yet (whitelist pending). These sample cards show how Respond will look.
            After you create a survey, real cards replace the previews. You can still open{' '}
            <Link to="/create">Create survey</Link> when ready.
          </p>
        </div>
      ) : null}

      <ul className="survey-picker__grid">
        {(showPreview ? PREVIEW_CARDS : liveCards).map((card) => (
          <SurveyCard key={card.key} card={card} onOpen={onOpen} />
        ))}
      </ul>

      <div className="actions">
        <button type="button" className="btn btn--ghost" onClick={() => void refresh()} disabled={loading}>
          <GlassIcon icon={IconMsgs} size={16} />
          <span style={{ marginLeft: 8 }}>Refresh</span>
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
      lede="Choose a live survey round, then encrypt and submit your answers."
    >
      <SurveyPicker
        onOpen={(e3Id) => {
          navigate(`/respond?e3=${encodeURIComponent(e3Id)}`)
        }}
      />
    </Shell>
  )
}

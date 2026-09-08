import type { CSSProperties, ReactNode } from 'react'
import { GlassIcon, SurveyIcons, glassAccentStyle, glassOkStyle } from './GlassIcon'
import { IconClipboardCheck, IconSparkle } from 'nucleo-glass'
import { useId } from 'react'

type ProgressProps = {
  title: string
  detail: string
  percent: number
}

/** Rectangle progress card (create-flow), inspired by upload progress UIs. */
export function CreateProgressCard({ title, detail, percent }: ProgressProps) {
  const uid = useId().replace(/:/g, '')
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))

  return (
    <div className="create-progress" role="status" aria-live="polite">
      <div className="create-progress__row">
        <span className="create-progress__icon" aria-hidden>
          <IconClipboardCheck size={28} uniqueId={uid} style={glassAccentStyle} />
        </span>
        <div className="create-progress__copy">
          <strong>{title}</strong>
          <span>
            <em>Working {clamped}%</em>
            {' · '}
            {detail}
          </span>
        </div>
      </div>
      <div className="create-progress__track" aria-hidden>
        <div
          className="create-progress__fill"
          style={{ width: `${clamped}%` } as CSSProperties}
        />
      </div>
    </div>
  )
}

type SuccessProps = {
  title: string
  respondUrl: string
  e3Id: string
  onCopy: () => void
  copied: boolean
  onClose: () => void
  children?: ReactNode
}

export function SurveyCreatedModal({
  title,
  respondUrl,
  e3Id,
  onCopy,
  copied,
  onClose,
}: SuccessProps) {
  const uid = useId().replace(/:/g, '')

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="survey-created-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-card__hero">
          <span className="modal-card__glyph" aria-hidden>
            <IconSparkle size={40} uniqueId={uid} style={glassOkStyle} />
          </span>
          <p className="modal-card__kicker">Survey live</p>
          <h2 id="survey-created-title">{title}</h2>
          <p className="modal-card__lede">
            Share this link so respondents can encrypt and submit answers. Round id{' '}
            <span className="mono">e3 {e3Id}</span>.
          </p>
        </div>

        <div className="modal-card__link-box">
          <GlassIcon icon={SurveyIcons.send} size={18} />
          <span className="mono modal-card__link">{respondUrl}</span>
        </div>

        <div className="modal-card__actions">
          <button type="button" className="btn btn--primary" onClick={onCopy}>
            {copied ? 'Copied' : 'Copy respond link'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

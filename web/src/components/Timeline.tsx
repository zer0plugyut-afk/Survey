export type TimelineStep = {
  id: string
  title: string
  subtitle: string
}

type Props = {
  steps: TimelineStep[]
  activeIndex: number
  /** Highest step the user may jump to (inclusive). */
  maxReachable: number
  onSelect: (index: number) => void
}

export function Timeline({ steps, activeIndex, maxReachable, onSelect }: Props) {
  return (
    <nav className="timeline" aria-label="Survey progress">
      <div className="timeline__rail" aria-hidden />
      <ol className="timeline__list">
        {steps.map((step, index) => {
          const done = index < activeIndex
          const active = index === activeIndex
          const locked = index > maxReachable
          return (
            <li key={step.id}>
              <button
                type="button"
                className={`timeline__item${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}
                disabled={locked}
                onClick={() => onSelect(index)}
                aria-current={active ? 'step' : undefined}
              >
                <span className="timeline__dot">{done ? '✓' : index + 1}</span>
                <span className="timeline__label">
                  <strong>{step.title}</strong>
                  <span>{step.subtitle}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

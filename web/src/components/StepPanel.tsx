import { ReactNode } from 'react'

type Props = {
  kicker: string
  title: string
  lede?: string
  children: ReactNode
}

export function StepPanel({ kicker, title, lede, children }: Props) {
  return (
    <section className="panel" aria-live="polite">
      <p className="panel__kicker">{kicker}</p>
      <h2>{title}</h2>
      {lede ? <p className="panel__lede">{lede}</p> : null}
      {children}
    </section>
  )
}

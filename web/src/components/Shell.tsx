import { Link, NavLink } from 'react-router-dom'
import { ReactNode, useEffect } from 'react'
import { ConnectKitButton } from 'connectkit'
import { ClipboardPlus, Home, MessagesSquare } from 'lucide-react'
import { SEPOLIA } from '../config/sepolia'

type Props = {
  children: ReactNode
  title: string
  badge?: string
  lede?: string
}

const NAV = [
  { to: '/', end: true, label: 'Home', Icon: Home },
  { to: '/create', end: false, label: 'Create survey', Icon: ClipboardPlus },
  { to: '/respond', end: false, label: 'Respond', Icon: MessagesSquare },
] as const

export function Shell({ children, title, badge = 'Privacy-preserving · E3', lede }: Props) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    document.documentElement.style.colorScheme = 'light'
    localStorage.removeItem('survey-theme')
  }, [])

  return (
    <>
      <div className="bg" aria-hidden />
      <div className="shell">
        <nav className="dock" aria-label="App navigation">
          {NAV.map(({ to, end, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `dock-btn${isActive ? ' is-active' : ''}`}
              title={label}
            >
              <span className="dock-btn__icon" aria-hidden>
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <span className="dock-btn__label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="shell-main">
          <header className="shell-topbar">
            <Link to="/" className="shell-topbar__brand" aria-label="Go to home">
              <span className="brand__mark brand__mark--sm">IF</span>
              <span className="shell-topbar__brand-text">Education survey</span>
            </Link>
            <div className="shell-topbar__actions">
              <div className="network-pill">
                {SEPOLIA.name} · {SEPOLIA.chainId}
              </div>
              <ConnectKitButton />
            </div>
          </header>
          <main className="workspace">
            <div className="workspace-inner">
              <header className="top">
                <div className="top__title">
                  <p className="top__badge">{badge}</p>
                  <h1>{title}</h1>
                  {lede ? <p className="top__lede">{lede}</p> : null}
                </div>
              </header>
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

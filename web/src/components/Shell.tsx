import { Link, NavLink } from 'react-router-dom'
import { ReactNode, useEffect, useId } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { isSurveyAdmin, SEPOLIA } from '../config/sepolia'
import { GlassIcon, NavIcons, glassAccentStyle } from './GlassIcon'

type Props = {
  children: ReactNode
  title: string
  badge?: string
  lede?: string
}

function DockIcon({ icon: Icon }: { icon: (typeof NavIcons)[keyof typeof NavIcons] }) {
  const uid = useId().replace(/:/g, '')
  return <Icon size={22} uniqueId={uid} style={glassAccentStyle} />
}

export function Shell({ children, title, badge = 'Privacy-preserving · E3', lede }: Props) {
  const { address } = useAccount()
  const showCreate = isSurveyAdmin(address)

  const nav = [
    { to: '/', end: true, label: 'Home', Icon: NavIcons.home },
    ...(showCreate
      ? [{ to: '/create', end: false, label: 'Create survey', Icon: NavIcons.create } as const]
      : []),
    { to: '/respond', end: false, label: 'Respond', Icon: NavIcons.respond },
  ] as const

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
          {nav.map(({ to, end, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `dock-btn${isActive ? ' is-active' : ''}`}
              title={label}
            >
              <span className="dock-btn__icon" aria-hidden>
                <DockIcon icon={Icon} />
              </span>
              <span className="dock-btn__label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="shell-main">
          <header className="shell-topbar">
            <Link to="/" className="shell-topbar__brand" aria-label="Go to home">
              <span className="brand__mark brand__mark--sm" aria-hidden>
                <GlassIcon icon={NavIcons.home} size={18} />
              </span>
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

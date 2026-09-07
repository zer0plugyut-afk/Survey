import { ConnectKitButton } from 'connectkit'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { Shell } from '../components/Shell'
import { CreateSurveyFlow } from '../flows/CreateSurveyFlow'
import { isSurveyAdmin, shortAddr, SURVEY_ADMIN_ADDRESS } from '../config/sepolia'

export function CreatePage() {
  const { address, isConnecting, isReconnecting } = useAccount()
  // Prefer `address` over `isConnected` — ConnectKit can show a connected pill while
  // wagmi's isConnected flickers false during reconnect.
  const connected = Boolean(address)
  const allowed = isSurveyAdmin(address)
  const pending = isConnecting || isReconnecting

  return (
    <Shell
      title="Create survey"
      lede="Vertical steps on the left; each stage opens in the panel on the right — same language as the community board."
    >
      {pending && !connected ? (
        <div className="status-box">
          <strong>Checking wallet…</strong>
          <p style={{ margin: '0.5rem 0 0' }}>Reconnecting your session.</p>
        </div>
      ) : !connected ? (
        <div className="status-box">
          <strong>Connect the researcher wallet</strong>
          <p style={{ margin: '0.5rem 0 1rem' }}>
            Creating surveys is limited to the admin wallet for this Sepolia version. Respondents can
            still use <Link to="/respond">Respond</Link> with any wallet.
          </p>
          <ConnectKitButton />
        </div>
      ) : !allowed ? (
        <div className="status-box">
          <strong>Create is admin-only</strong>
          <p style={{ margin: '0.5rem 0 0' }}>
            Connected {shortAddr(address)}. Only {shortAddr(SURVEY_ADMIN_ADDRESS)} can open a new E3
            survey round right now. Switch wallet in the header, or go to{' '}
            <Link to="/respond">Respond</Link> / <Link to="/">Home</Link>.
          </p>
        </div>
      ) : (
        <CreateSurveyFlow />
      )}
    </Shell>
  )
}

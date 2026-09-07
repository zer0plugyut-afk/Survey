import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { ClipboardPlus, EyeOff, Lock, MessagesSquare, Shield, Sparkles, Users } from 'lucide-react'
import { isSurveyAdmin, SEPOLIA, shortAddr } from '../config/sepolia'

function useSoftTheme() {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    document.documentElement.style.colorScheme = 'light'
    localStorage.removeItem('survey-theme')
  }, [])
}

export function HomePage() {
  useSoftTheme()
  const { address } = useAccount()
  const canCreate = isSurveyAdmin(address)

  return (
    <>
      <div className="bg" aria-hidden />
      <div className="landing">
        <header className="landing-nav">
          <Link to="/" className="landing-nav__brand">
            <span className="brand__mark">IF</span>
            <span className="landing-nav__name">InterFold Survey</span>
          </Link>
          <nav className="landing-nav__links" aria-label="Primary">
            {canCreate ? <Link to="/create">Create</Link> : null}
            <Link to="/respond">Respond</Link>
          </nav>
          <div className="landing-nav__actions">
            <span className="network-pill">{SEPOLIA.name}</span>
            <ConnectKitButton />
          </div>
        </header>

        <main>
          <section className="landing-hero">
            <p className="landing-hero__brand">InterFold</p>
            <h1>Honest course feedback without exposing anyone’s answers</h1>
            <p className="landing-hero__lede">
              Privacy-preserving education surveys on Sepolia — encrypt in the browser, tally under a ciphernode
              committee, publish class totals only.
            </p>
            <div className="landing-hero__cta">
              {canCreate ? (
                <Link className="btn btn--primary home-cta__btn" to="/create">
                  <ClipboardPlus size={16} strokeWidth={2} aria-hidden />
                  Create a survey
                </Link>
              ) : null}
              <Link className="btn home-cta__btn" to="/respond">
                <MessagesSquare size={16} strokeWidth={2} aria-hidden />
                Answer a survey
              </Link>
            </div>
            {!canCreate ? (
              <p className="landing-hero__lede" style={{ marginTop: '1rem', fontSize: '0.95rem' }}>
                Creating rounds is limited to the demo researcher wallet
                {address ? ` (connected ${shortAddr(address)})` : ''}. Anyone can respond once a survey link is
                shared.
              </p>
            ) : null}
          </section>

          <section className="landing-section">
            <div className="section-head">
              <h2>What decrypts — and what never does</h2>
              <p>Individual Likert and yes/no answers stay ciphertext. Only verified aggregates leave the committee.</p>
            </div>
            <ul className="landing-checks">
              <li>
                <Lock size={18} aria-hidden />
                <div>
                  <strong>Answers stay sealed</strong>
                  <span>Each response is encrypted under the committee key before any transaction is signed.</span>
                </div>
              </li>
              <li>
                <Users size={18} aria-hidden />
                <div>
                  <strong>Class-level results</strong>
                  <span>Researchers see means and counts — not each student’s row.</span>
                </div>
              </li>
              <li>
                <Shield size={18} aria-hidden />
                <div>
                  <strong>No single operator key</strong>
                  <span>Threshold crypto — no one party can peek mid-flight.</span>
                </div>
              </li>
            </ul>
          </section>

          <section className="landing-section">
            <div className="section-head">
              <h2>Typical survey platforms vs InterFold</h2>
              <p>
                Most web forms store clear answers on a server someone can open. InterFold never puts individual
                plaintext on that path — so people can rate workload, teaching, and wellbeing without soft-pedaling.
              </p>
            </div>
            <div className="compare">
              <article className="compare-card compare-card--plain">
                <p className="compare-card__tag">Typical web survey</p>
                <h3>Answers are visible somewhere</h3>
                <ul>
                  <li>Responses land in a database or sheet as readable text</li>
                  <li>Admins, IT, or a vendor can look up who said what</li>
                  <li>Screenshots, exports, and “anonymous” forms still leak identity</li>
                  <li>Honest feedback shrinks when students fear retaliation</li>
                </ul>
              </article>
              <article className="compare-card compare-card--fold">
                <p className="compare-card__tag">InterFold survey</p>
                <h3>Only the class total decrypts</h3>
                <ul>
                  <li>Each answer leaves the browser already encrypted</li>
                  <li>On-chain publish is ciphertext + a proof — not your raw score</li>
                  <li>A ciphernode committee decrypts the verified aggregate only</li>
                  <li>Researchers get averages and counts, not individual rows</li>
                </ul>
              </article>
            </div>
            <div className="compare-benefit">
              <EyeOff size={18} aria-hidden />
              <p>
                <strong>Why it matters:</strong> when nobody can open your personal answers, feedback on hard topics
                stays honest — and the school still gets the signal it needs from the group.
              </p>
            </div>
          </section>

          <section className="landing-section">
            <div className="section-head">
              <h2>Where InterFold changes the game</h2>
              <p>
                E3 runs the tally on encrypted data. Your SurveyProgram sets the rules; ciphernodes open an input window,
                then compute and decrypt only the verified aggregate.
              </p>
            </div>
            <div className="home-pillars">
              <article className="home-pillar">
                <Sparkles size={22} strokeWidth={1.6} aria-hidden />
                <h3>Encrypt in the browser</h3>
                <p>SDK seals each answer under the committee public key before any transaction is signed.</p>
              </article>
              <article className="home-pillar">
                <Shield size={22} strokeWidth={1.6} aria-hidden />
                <h3>Committee, not a server admin</h3>
                <p>Sortition + threshold crypto — no single party can peek at raw responses mid-flight.</p>
              </article>
              <article className="home-pillar">
                <Users size={22} strokeWidth={1.6} aria-hidden />
                <h3>Publish aggregates only</h3>
                <p>After the window closes, plaintext output is stats for the class — not each student’s row.</p>
              </article>
            </div>
          </section>

          <section className="landing-section">
            <div className="section-head">
              <h2>Two roles</h2>
              <p>Same app, different jobs — researcher opens a round; respondents fill it before the timer ends.</p>
            </div>
            <div className="home-grid">
              <Link className="home-card" to="/create">
                <span className="home-card__tag">Researcher</span>
                <h2>Create a survey</h2>
                <p>Set the title and answer window, request an E3, then share the respond link.</p>
              </Link>
              <Link className="home-card" to="/respond">
                <span className="home-card__tag">Respondent</span>
                <h2>Answer a survey</h2>
                <p>Open the link, answer five integer questions, encrypt, and publish ciphertext on Sepolia.</p>
              </Link>
            </div>
          </section>

          <footer className="landing-foot">
            <div className="status-box status-box--ok">
              <strong>Live on Sepolia</strong>
              InterFold · <span className="mono">{shortAddr(SEPOLIA.contracts.interfold)}</span>
              {' · '}
              Registry · <span className="mono">{shortAddr(SEPOLIA.contracts.ciphernodeRegistry)}</span>
              {' · '}
              SurveyProgram · <span className="mono">{shortAddr(SEPOLIA.contracts.e3Program)}</span>
            </div>
          </footer>
        </main>
      </div>
    </>
  )
}

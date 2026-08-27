import { Shell } from '../components/Shell'
import { SEPOLIA, shortAddr } from '../config/sepolia'

export function SubmitProgramPage() {
  return (
    <Shell title="Submit SurveyProgram" badge="Interfold registration">
      <section className="panel">
        <p className="panel__kicker">Sepolia whitelist</p>
        <h2>What to send InterFold</h2>
        <p className="panel__lede">
          Deploy <code>SurveyProgram</code> on Sepolia, then ask InterFold to register it so{' '}
          <code>requestE3</code> can target your address. Full checklist:{' '}
          <code>docs/SUBMIT-PROGRAM.md</code>.
        </p>

        <div className="stat-row">
          <div className="stat">
            <p className="stat__label">Interfold</p>
            <p className="stat__value" style={{ fontSize: '0.95rem' }}>
              {shortAddr(SEPOLIA.contracts.interfold)}
            </p>
          </div>
          <div className="stat">
            <p className="stat__label">Your E3 program</p>
            <p className="stat__value" style={{ fontSize: '0.95rem' }}>
              {shortAddr(SEPOLIA.contracts.e3Program)}
            </p>
          </div>
          <div className="stat">
            <p className="stat__label">BFV (frontend)</p>
            <p className="stat__value" style={{ fontSize: '0.85rem' }}>
              {SEPOLIA.thresholdBfvParamsPresetName} · paramSet {SEPOLIA.paramSet}
            </p>
          </div>
        </div>

        <div className="status-box status-box--pending" style={{ marginTop: 14 }}>
          <strong>Waiting on InterFold</strong>
          Program is <em>not whitelisted</em> yet — <code>requestE3</code> returns{' '}
          <code>E3ProgramNotAllowed</code> until InterFold registers{' '}
          <span className="mono">{SEPOLIA.contracts.e3Program}</span>.
          <br />
          <br />
          Stack matches official Sepolia docs: insecure-512 / paramSet 0. Copy the short message from{' '}
          <code>docs/SUBMIT-PROGRAM.md</code>.
        </div>

        <ol style={{ color: 'var(--muted)', fontSize: '0.8rem', lineHeight: 1.55, paddingLeft: 18 }}>
          <li>Implement IE3Program (validate / publishInput / verify).</li>
          <li>Compile circuits + deploy Honk + program; verify on Etherscan.</li>
          <li>Message InterFold with program address, ImageID, Honk, BFV preset, purpose.</li>
          <li>
            Set <code>VITE_E3_PROGRAM_ADDRESS</code>; align SDK preset, <code>paramSet</code>, and{' '}
            <code>web/src/circuits/</code> JSON.
          </li>
          <li>Prove with app-owned UDE + fold — not SDK <code>generateProof</code>.</li>
          <li>After whitelist: smoke-test fee approve + requestE3 + respond + publishInput.</li>
        </ol>

        <div className="note" style={{ marginTop: 16 }}>
          Docs:{' '}
          <a href="https://docs.theinterfold.com/sdk" target="_blank" rel="noreferrer">
            Interfold SDK
          </a>{' '}
          · <strong>docs/SUBMIT-PROGRAM.md</strong> · <strong>docs/CIRCUITS.md</strong> ·{' '}
          <strong>TODO.md</strong>
        </div>
      </section>
    </Shell>
  )
}

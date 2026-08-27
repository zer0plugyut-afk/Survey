import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAccount, useWalletClient } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { Timeline, TimelineStep } from '../components/Timeline'
import { StepPanel } from '../components/StepPanel'
import { QuestionForm } from '../components/QuestionForm'
import { resolveSurveyQuestions, type SurveyQuestion } from '../data/questions'
import { SEPOLIA, shortAddr } from '../config/sepolia'
import { useSurveySdk } from '../providers/InterfoldSdkProvider'
import { getSurveyByE3Id } from '../storage/surveyDb'
import { resolveCommitteeEncryptionKey } from '../utils/committeeKey'
import { publishEncryptedAnswer } from '../utils/publishInput'
import { generateSurveyFoldProof } from '../utils/surveyFoldProof'

const STEPS: TimelineStep[] = [
  { id: 'wallet', title: 'Connect', subtitle: 'Sepolia wallet' },
  { id: 'answer', title: 'Answer', subtitle: 'Encrypted later' },
  { id: 'submit', title: 'Submit', subtitle: 'publishInput' },
  { id: 'done', title: 'Done', subtitle: 'Thank you' },
]

function emptyAnswers(questions: SurveyQuestion[]) {
  return Object.fromEntries(questions.map((q) => [q.id, null])) as Record<string, number | null>
}

export function RespondFlow() {
  const [params] = useSearchParams()
  const e3FromUrl = params.get('e3')
  const { isConnected, address, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  const sdk = useSurveySdk()

  const [step, setStep] = useState(0)
  const [maxReachable, setMaxReachable] = useState(0)
  const [questions, setQuestions] = useState<SurveyQuestion[]>(() => resolveSurveyQuestions())
  const [surveyTitle, setSurveyTitle] = useState('Course feedback')
  const [answers, setAnswers] = useState<Record<string, number | null>>(() =>
    emptyAnswers(resolveSurveyQuestions()),
  )
  const [busy, setBusy] = useState(false)
  const [proveStatus, setProveStatus] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!e3FromUrl) return
    void (async () => {
      const stored = await getSurveyByE3Id(e3FromUrl)
      const next = resolveSurveyQuestions(stored)
      setQuestions(next)
      setAnswers(emptyAnswers(next))
      if (stored?.title) setSurveyTitle(stored.title)
    })()
  }, [e3FromUrl])

  const complete = useMemo(
    () => questions.every((q) => answers[q.id] !== null && answers[q.id] !== undefined),
    [answers, questions],
  )

  const go = (next: number) => {
    setStep(next)
    setMaxReachable((m) => Math.max(m, next))
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    setProveStatus(null)
    try {
      if (!sdk.sdk) throw new Error('SDK not initialized')
      if (!walletClient || !address) throw new Error('Connect wallet')
      if (chainId !== SEPOLIA.chainId) throw new Error('Switch to Sepolia')
      if (!e3FromUrl) throw new Error('Missing e3 id in URL — open the researcher respond link')

      setProveStatus('Resolving committee BFV public key…')
      const { publicKey, pkCommitment } = await resolveCommitteeEncryptionKey(
        sdk.sdk,
        BigInt(e3FromUrl),
      )

      let lastHash: `0x${string}` | null = null

      for (let questionIndex = 0; questionIndex < questions.length; questionIndex++) {
        const q = questions[questionIndex]
        const value = BigInt(answers[q.id] as number)
        const label = `Q${questionIndex + 1}/${questions.length}`
        setProveStatus(`${label}: starting fold proof…`)

        const proved = await generateSurveyFoldProof({
          value,
          publicKey,
          respondent: address,
          questionIndex,
          onStatus: (msg) => setProveStatus(`${label}: ${msg}`),
        })

        // SurveyProgram PI[6] = on-chain committeePublicKey (pk commitment).
        if (proved.publicInputs[6].toLowerCase() !== pkCommitment.toLowerCase()) {
          throw new Error(
            'Fold pk_commitment does not match on-chain committeePublicKey — BFV preset / key mismatch',
          )
        }

        setProveStatus(`${label}: submitting publishInput…`)
        lastHash = await publishEncryptedAnswer(
          walletClient,
          address,
          BigInt(e3FromUrl),
          proved.ciphertext,
          proved.commitment,
          { questionIndex, proof: proved.proof },
        )
      }

      setTxHash(lastHash)
      setProveStatus(null)
      go(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flow">
      <Timeline steps={STEPS} activeIndex={step} maxReachable={maxReachable} onSelect={setStep} />

      {step === 0 && (
        <StepPanel
          kicker="Step 1 · Wallet"
          title={isConnected ? 'Wallet ready' : 'Join this survey round'}
          lede={
            isConnected
              ? 'You’re connected in the header. Continue to answer the questions.'
              : 'Answers encrypt under the ciphernode committee key before leaving the browser.'
          }
        >
          <div className="status-box">
            <strong>Round</strong>
            <span className="mono">{e3FromUrl ?? 'Open respond link from the researcher (includes e3 id)'}</span>
            {isConnected && chainId !== SEPOLIA.chainId ? (
              <>
                <br />
                Switch to Sepolia in the header wallet control to continue.
              </>
            ) : null}
          </div>
          <div className="actions">
            {!isConnected ? <ConnectKitButton /> : null}
            {isConnected && sdk.isInitialized ? (
              <button type="button" className="btn btn--primary" onClick={() => go(1)}>
                Continue
              </button>
            ) : null}
          </div>
        </StepPanel>
      )}

      {step === 1 && (
        <StepPanel kicker="Step 2 · Answers" title={surveyTitle} lede="Select a value for each question.">
          <QuestionForm
            answers={answers}
            questions={questions}
            onChange={(id, value) => setAnswers((prev) => ({ ...prev, [id]: value }))}
          />
          <div className="actions">
            <button type="button" className="btn btn--ghost" onClick={() => go(0)}>
              Back
            </button>
            <button type="button" className="btn btn--primary" disabled={!complete} onClick={() => go(2)}>
              Continue
            </button>
          </div>
        </StepPanel>
      )}

      {step === 2 && (
        <StepPanel
          kicker="Step 3 · Encrypt, prove & submit"
          title="Publish ciphertext"
          lede="Builds a survey_fold Honk proof (encryption + allowed range), then calls SurveyProgram.publishInput. Proving can take several minutes per question."
        >
          <div className="status-box">
            <strong>Program</strong>
            <span className="mono">{shortAddr(SEPOLIA.contracts.e3Program)}</span>
            <br />
            <strong>BFV preset</strong>
            <span className="mono">
              {SEPOLIA.thresholdBfvParamsPresetName} (paramSet {SEPOLIA.paramSet})
            </span>
          </div>
          {proveStatus ? <p className="note">{proveStatus}</p> : null}
          {error ? <p className="note note--error">{error}</p> : null}
          <div className="actions">
            <button type="button" className="btn btn--ghost" onClick={() => go(1)} disabled={busy}>
              Back
            </button>
            <button type="button" className="btn btn--primary" disabled={busy} onClick={submit}>
              {busy ? 'Proving…' : 'Prove & submit'}
            </button>
          </div>
        </StepPanel>
      )}

      {step === 3 && (
        <StepPanel kicker="Step 4 · Done" title="Thank you" lede="Encrypted responses are on-chain. Only aggregates decrypt later.">
          <div className="status-box">
            <strong>Last transaction</strong>
            {txHash ? (
              <a className="mono" href={`${SEPOLIA.explorer}/tx/${txHash}`} target="_blank" rel="noreferrer">
                {txHash}
              </a>
            ) : (
              '—'
            )}
          </div>
        </StepPanel>
      )}
    </div>
  )
}

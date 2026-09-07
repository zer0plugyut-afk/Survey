import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import {
  DEFAULT_COMPUTE_PROVIDER_PARAMS,
  DEFAULT_E3_CONFIG,
  calculateInputWindow,
  encodeComputeProviderParams,
} from '@interfold/sdk'
import { Timeline, TimelineStep } from '../components/Timeline'
import { StepPanel } from '../components/StepPanel'
import { SoftSelect } from '../components/SoftSelect'
import { QuestionEditor } from '../components/QuestionEditor'
import { SEPOLIA, shortAddr } from '../config/sepolia'
import {
  SCHEMA_VERSION,
  SURVEY_QUESTIONS,
  blankCustomQuestions,
  cloneDraftQuestions,
  customQuestionsReady,
  type SurveyQuestion,
} from '../data/questions'
import { useSurveySdk } from '../providers/InterfoldSdkProvider'
import { schemaHash } from '../utils/e3'
import { buildAggregates, QUESTIONS_PER_RESPONSE, type SurveyAggregates } from '../utils/surveyResults'
import { readSurveyInputCount } from '../utils/surveyProgram'
import {
  DEMO_DRAFT_ID,
  ensureDemoDraft,
  getSurvey,
  getSurveyByE3Id,
  listSurveys,
  putSurvey,
  respondPathFor,
  windowLabelFrom,
  type StoredSurvey,
} from '../storage/surveyDb'

const STEPS: TimelineStep[] = [
  { id: 'wallet', title: 'Connect', subtitle: 'Sepolia wallet' },
  { id: 'configure', title: 'Configure', subtitle: 'Title & questions' },
  { id: 'request', title: 'Request E3', subtitle: 'Committee + keys' },
  { id: 'live', title: 'Collect', subtitle: 'Share respond link' },
  { id: 'results', title: 'Results', subtitle: 'Per-question tallies' },
]

function emptyAggregates(): SurveyAggregates {
  return {
    plaintextHex: null,
    questionTallies: [],
    aggregateSum: null,
    inputCount: null,
    estimatedRespondents: null,
    meanAnswer: null,
  }
}

export function CreateSurveyFlow() {
  const { isConnected, chainId } = useAccount()
  const sdk = useSurveySdk()
  const [step, setStep] = useState(0)
  const [maxReachable, setMaxReachable] = useState(0)
  const [title, setTitle] = useState('Spring 2026 course feedback')
  const [windowValue, setWindowValue] = useState(48)
  const [windowUnit, setWindowUnit] = useState<'minutes' | 'hours'>('hours')
  const [questionSource, setQuestionSource] = useState<'draft' | 'custom' | null>(null)
  const [customQuestions, setCustomQuestions] = useState<SurveyQuestion[]>(() => blankCustomQuestions())
  const windowSeconds = windowUnit === 'hours' ? windowValue * 3600 : windowValue * 60
  const windowLabel = windowLabelFrom(windowValue, windowUnit)
  const [surveyId, setSurveyId] = useState(DEMO_DRAFT_ID)
  const [e3Id, setE3Id] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [publicKey, setPublicKey] = useState<`0x${string}` | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [whitelistNote, setWhitelistNote] = useState(false)
  const [saved, setSaved] = useState<StoredSurvey[]>([])
  const [aggregates, setAggregates] = useState<SurveyAggregates>(emptyAggregates)
  const [resultsStatus, setResultsStatus] = useState('Waiting for committee compute + decrypt…')

  const go = (next: number) => {
    setStep(next)
    setMaxReachable((m) => Math.max(m, next))
  }

  const refreshSaved = useCallback(async () => {
    await ensureDemoDraft()
    setSaved(await listSurveys())
  }, [])

  const persist = useCallback(
    async (patch: Partial<StoredSurvey> & { id?: string }) => {
      const id = patch.id ?? (patch.e3Id ? `e3-${patch.e3Id}` : surveyId)
      const prev = (await getSurvey(id)) ?? (await getSurvey(surveyId))
      const base: StoredSurvey = prev ?? {
        id,
        e3Id: null,
        title,
        windowValue,
        windowUnit,
        windowSeconds,
        windowLabel,
        schemaVersion: SCHEMA_VERSION,
        questionSource: questionSource ?? undefined,
        questions: questionSource === 'custom' ? customQuestions : undefined,
        status: 'draft',
        txHash: null,
        publicKey: null,
        plaintextSum: null,
        plaintextHex: null,
        inputCount: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      const resolvedSource = patch.questionSource ?? questionSource ?? base.questionSource
      const resolvedQuestions =
        patch.questions ??
        (resolvedSource === 'custom'
          ? customQuestions
          : resolvedSource === 'draft'
            ? undefined
            : base.questions)
      const next: StoredSurvey = {
        ...base,
        ...patch,
        id,
        title: patch.title ?? title,
        windowValue: patch.windowValue ?? windowValue,
        windowUnit: patch.windowUnit ?? windowUnit,
        windowSeconds: patch.windowSeconds ?? windowSeconds,
        windowLabel: patch.windowLabel ?? windowLabel,
        questionSource: resolvedSource ?? undefined,
        questions: resolvedSource === 'custom' ? resolvedQuestions : undefined,
        schemaVersion: SCHEMA_VERSION,
        updatedAt: Date.now(),
      }
      await putSurvey(next)
      setSurveyId(id)
      await refreshSaved()
      return next
    },
    [
      surveyId,
      title,
      windowValue,
      windowUnit,
      windowSeconds,
      windowLabel,
      questionSource,
      customQuestions,
      refreshSaved,
    ],
  )

  const hydrateFromStored = useCallback((s: StoredSurvey) => {
    setSurveyId(s.id)
    setTitle(s.title)
    setWindowValue(s.windowValue)
    setWindowUnit(s.windowUnit)
    setQuestionSource(s.questionSource ?? null)
    setCustomQuestions(
      s.questionSource === 'custom' && s.questions?.length === 5
        ? s.questions.map((q) => ({ ...q }))
        : blankCustomQuestions(),
    )
    setE3Id(s.e3Id)
    setTxHash(s.txHash)
    setPublicKey((s.publicKey as `0x${string}` | null) ?? null)
    setAggregates(
      buildAggregates({
        plaintextOutput: s.plaintextHex,
        inputCount: s.inputCount,
      }),
    )
    if (s.plaintextSum != null) setResultsStatus('Plaintext output loaded from local store')
    if (s.e3Id) {
      const next = s.plaintextSum != null ? 4 : 3
      setStep(next)
      setMaxReachable((m) => Math.max(m, next))
    } else {
      setStep(1)
      setMaxReachable((m) => Math.max(m, 1))
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await refreshSaved()
      const params = new URLSearchParams(window.location.search)
      const fromUrl = params.get('e3')
      if (fromUrl) {
        const byE3 = await getSurveyByE3Id(fromUrl)
        if (byE3) {
          hydrateFromStored(byE3)
          return
        }
        setE3Id(fromUrl)
        go(3)
        return
      }
      const demo = await ensureDemoDraft()
      hydrateFromStored(demo)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once
  }, [])

  useEffect(() => {
    if (isConnected && sdk.isInitialized && step === 0) go(1)
  }, [isConnected, sdk.isInitialized, step])

  const refreshOnChainResults = useCallback(async () => {
    if (!sdk.sdk || !e3Id) return
    try {
      const id = BigInt(e3Id)
      const e3 = await sdk.sdk.getE3(id)
      let inputCount: number | null = null
      try {
        inputCount = await readSurveyInputCount(sdk.sdk.getPublicClient() as never, id)
      } catch {
        /* round may not be initialized yet */
      }
      const next = buildAggregates({
        plaintextOutput: e3.plaintextOutput,
        inputCount,
      })
      setAggregates(next)

      if (e3.committeePublicKey && e3.committeePublicKey !== '0x') {
        setPublicKey(e3.committeePublicKey as `0x${string}`)
      }

      if (next.questionTallies.some((t) => t.sum != null) || next.aggregateSum != null) {
        setResultsStatus('Committee published plaintext output')
        await persist({
          id: `e3-${e3Id}`,
          e3Id,
          status: 'complete',
          publicKey: e3.committeePublicKey || publicKey,
          plaintextSum: next.aggregateSum,
          plaintextHex: next.plaintextHex,
          inputCount: next.inputCount,
        })
        setMaxReachable((m) => Math.max(m, 4))
      } else if (e3.ciphertextOutput && e3.ciphertextOutput !== '0x') {
        setResultsStatus('Ciphertext output published — waiting for decryption…')
        await persist({
          id: `e3-${e3Id}`,
          e3Id,
          status: 'collecting',
          publicKey: e3.committeePublicKey || publicKey,
          inputCount: next.inputCount,
        })
      } else if (inputCount != null) {
        setResultsStatus(
          inputCount > 0
            ? `${inputCount} encrypted input(s) on-chain — waiting for compute + decrypt…`
            : 'No answers published yet',
        )
        await persist({
          id: `e3-${e3Id}`,
          e3Id,
          status: 'collecting',
          publicKey: publicKey,
          inputCount,
        })
      }
    } catch (err) {
      console.warn('refreshOnChainResults', err)
      setResultsStatus('Could not read E3 state yet — will retry when events arrive')
    }
  }, [sdk, e3Id, persist, publicKey])

  useEffect(() => {
    if (!sdk.isInitialized) return

    const onRequested = (event: { data?: { e3Id?: bigint } }) => {
      if (event.data?.e3Id === undefined) return
      const id = event.data.e3Id.toString()
      setE3Id(id)
      void persist({
        id: `e3-${id}`,
        e3Id: id,
        status: 'requested',
        txHash,
        title,
        windowValue,
        windowUnit,
        windowSeconds,
        windowLabel,
      })
    }

    const onCommittee = (event: { data?: { e3Id?: bigint; publicKey?: string } }) => {
      if (event.data?.e3Id !== undefined) {
        const id = event.data.e3Id.toString()
        setE3Id(id)
        if (event.data.publicKey) setPublicKey(event.data.publicKey as `0x${string}`)
        void persist({
          id: `e3-${id}`,
          e3Id: id,
          status: 'collecting',
          publicKey: event.data.publicKey ?? null,
          title,
          windowValue,
          windowUnit,
          windowSeconds,
          windowLabel,
        })
      } else if (event.data?.publicKey) {
        setPublicKey(event.data.publicKey as `0x${string}`)
      }
      go(3)
    }

    const onCiphertext = (event: { data?: { e3Id?: bigint } }) => {
      if (event.data?.e3Id !== undefined && e3Id && event.data.e3Id.toString() !== e3Id) return
      setResultsStatus('Ciphertext output published — waiting for decryption…')
      void refreshOnChainResults()
    }

    const onPlaintext = (event: { data?: { e3Id?: bigint; plaintextOutput?: string } }) => {
      const id = event.data?.e3Id?.toString()
      if (id && e3Id && id !== e3Id) return
      if (id && !e3Id) setE3Id(id)
      const sum = buildAggregates({ plaintextOutput: event.data?.plaintextOutput }).aggregateSum
      setResultsStatus('PlaintextOutputPublished received')
      const liveId = id ?? e3Id
      if (liveId) {
        void persist({
          id: `e3-${liveId}`,
          e3Id: liveId,
          status: 'complete',
          plaintextSum: sum,
          plaintextHex: event.data?.plaintextOutput ?? null,
        })
      }
      go(4)
      void refreshOnChainResults()
    }

    sdk.onInterfoldEvent(sdk.InterfoldEventType.E3_REQUESTED, onRequested)
    sdk.onInterfoldEvent(sdk.RegistryEventType.COMMITTEE_PUBLISHED, onCommittee)
    sdk.onInterfoldEvent(sdk.InterfoldEventType.CIPHERTEXT_OUTPUT_PUBLISHED, onCiphertext)
    sdk.onInterfoldEvent(sdk.InterfoldEventType.PLAINTEXT_OUTPUT_PUBLISHED, onPlaintext)
    return () => {
      sdk.off(sdk.InterfoldEventType.E3_REQUESTED, onRequested)
      sdk.off(sdk.RegistryEventType.COMMITTEE_PUBLISHED, onCommittee)
      sdk.off(sdk.InterfoldEventType.CIPHERTEXT_OUTPUT_PUBLISHED, onCiphertext)
      sdk.off(sdk.InterfoldEventType.PLAINTEXT_OUTPUT_PUBLISHED, onPlaintext)
    }
  }, [
    sdk,
    e3Id,
    txHash,
    title,
    windowValue,
    windowUnit,
    windowSeconds,
    windowLabel,
    persist,
    refreshOnChainResults,
  ])

  useEffect(() => {
    if (!e3Id || !sdk.isInitialized) return
    void refreshOnChainResults()
    const t = window.setInterval(() => void refreshOnChainResults(), 20_000)
    return () => window.clearInterval(t)
  }, [e3Id, sdk.isInitialized, refreshOnChainResults])

  const requestE3 = async () => {
    setBusy(true)
    setError(null)
    setWhitelistNote(false)
    try {
      if (!sdk.sdk) throw new Error('SDK not initialized — connect wallet on Sepolia')
      if (chainId !== SEPOLIA.chainId) throw new Error('Switch MetaMask to Sepolia')

      await persist({
        id: surveyId,
        e3Id: null,
        status: 'draft',
        title,
        windowValue,
        windowUnit,
        windowSeconds,
        windowLabel,
        questionSource: questionSource ?? undefined,
        questions: questionSource === 'custom' ? customQuestions : undefined,
      })

      const publicClient = sdk.sdk.getPublicClient()
      const duration = Math.max(60, windowSeconds)
      // Approve can take >15s; InterFold rejects windows whose start is already past.
      const startBuffer = 180n
      const computeProviderParams = encodeComputeProviderParams(DEFAULT_COMPUTE_PROVIDER_PARAMS)

      const quoteWindow = await calculateInputWindow(publicClient, duration, startBuffer)
      const quoteParams = {
        committeeSize: DEFAULT_E3_CONFIG.committeeSize,
        inputWindow: quoteWindow,
        e3Program: SEPOLIA.contracts.e3Program,
        paramSet: SEPOLIA.paramSet,
        computeProviderParams,
      }

      const fee = await sdk.sdk.getE3Quote(quoteParams)
      const approveTx = await sdk.sdk.approveFeeToken(fee)
      await publicClient.waitForTransactionReceipt({ hash: approveTx })

      // Fresh window after approve so start is still in the future at request time.
      const inputWindow = await calculateInputWindow(publicClient, duration, startBuffer)
      const hash = await sdk.requestE3({
        ...quoteParams,
        inputWindow,
        maxFee: fee,
      })
      setTxHash(hash)
      await persist({
        id: surveyId,
        status: 'requested',
        txHash: hash,
        title,
        windowValue,
        windowUnit,
        windowSeconds,
        windowLabel,
      })
      go(3)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      if (
        /not allowed|whitelist|unauthorized|register|forbidden|E3ProgramNotEnabled|program not/i.test(msg) &&
        !/InvalidInputDeadlineStart/i.test(msg)
      ) {
        setWhitelistNote(true)
      }
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  const respondPath = useMemo(() => respondPathFor(e3Id), [e3Id])

  const fmt = (n: number | null, digits = 2) =>
    n == null || Number.isNaN(n) ? '—' : Number.isInteger(n) ? String(n) : n.toFixed(digits)

  return (
    <div className="flow">
      <Timeline steps={STEPS} activeIndex={step} maxReachable={maxReachable} onSelect={setStep} />

      {step === 0 && (
        <StepPanel
          kicker="Step 1 · Wallet"
          title={isConnected ? 'Wallet ready' : 'Connect on Sepolia'}
          lede={
            isConnected
              ? 'You’re connected in the header. Continue to configure the survey round.'
              : 'Researcher wallet pays the E3 fee and requests a computation round. Individual answers stay encrypted.'
          }
        >
          <div className="status-box">
            <strong>Network</strong>
            Sepolia · SurveyProgram <span className="mono">{shortAddr(SEPOLIA.contracts.e3Program)}</span>
            {isConnected && chainId !== SEPOLIA.chainId ? (
              <>
                <br />
                Switch to Sepolia in the header wallet control to continue.
              </>
            ) : null}
          </div>
          {sdk.error ? <p className="note note--error">{sdk.error}</p> : null}
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
        <StepPanel
          kicker="Step 2 · Configure"
          title="Survey parameters"
          lede="Pick the built-in draft questions or write your own. Still five integer answers for SurveyProgram. Title and input window apply either way."
        >
          {saved.length > 0 ? (
            <div className="status-box">
              <strong>Saved locally</strong>
              <ul className="saved-list">
                {saved.map((s) => (
                  <li key={s.id}>
                    <button type="button" className="linkish" onClick={() => hydrateFromStored(s)}>
                      {s.title}
                      {s.e3Id ? ` · e3 ${s.e3Id}` : ' · draft'}
                      {s.status === 'complete' ? ' · results' : ''}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="title">Survey title</label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="window">How long can people answer?</label>
            <div className="field-row">
              <input
                id="window"
                type="number"
                min={1}
                max={windowUnit === 'hours' ? 168 : 10080}
                value={windowValue}
                onChange={(e) => setWindowValue(Math.max(1, Number(e.target.value) || 1))}
              />
              <SoftSelect
                aria-label="Window unit"
                value={windowUnit}
                options={[
                  { value: 'minutes', label: 'Minutes' },
                  { value: 'hours', label: 'Hours' },
                ]}
                onChange={setWindowUnit}
              />
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
              After this, new answers are rejected. Short windows (e.g. 5 minutes) are good for demos.
            </span>
          </div>

          <div className="field" style={{ marginBottom: 8 }}>
            <label>Questions</label>
          </div>
          <div className="source-picker" role="radiogroup" aria-label="Question source">
            <button
              type="button"
              role="radio"
              aria-checked={questionSource === 'draft'}
              className={`source-card${questionSource === 'draft' ? ' is-selected' : ''}`}
              onClick={() => setQuestionSource('draft')}
            >
              <span className="source-card__kicker">Option A</span>
              <span className="source-card__title">Use draft questions</span>
              <span className="source-card__body">
                Course-feedback template the app ships with — five Likert / yes-no items, ready for demos.
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={questionSource === 'custom'}
              className={`source-card${questionSource === 'custom' ? ' is-selected' : ''}`}
              onClick={() => {
                setQuestionSource('custom')
                setCustomQuestions((prev) =>
                  prev.some((q) => q.prompt.trim()) ? prev : blankCustomQuestions(),
                )
              }}
            >
              <span className="source-card__kicker">Option B</span>
              <span className="source-card__title">Create my own</span>
              <span className="source-card__body">
                Write five prompts yourself. Same on-chain shape (integers only) — you choose the wording.
              </span>
            </button>
          </div>

          {questionSource === 'draft' ? (
            <>
              <div className="status-box">
                <strong>Schema · {SCHEMA_VERSION}</strong>
                {SURVEY_QUESTIONS.length} questions · hash {shortAddr(schemaHash())}
              </div>
              <ul className="draft-preview">
                {cloneDraftQuestions().map((q, i) => (
                  <li key={q.id}>
                    <span className="draft-preview__meta">
                      Q{i + 1} · {q.kind === 'likert' ? 'Likert 1–5' : 'Yes / no'}
                    </span>
                    {q.prompt}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {questionSource === 'custom' ? (
            <QuestionEditor questions={customQuestions} onChange={setCustomQuestions} />
          ) : null}

          {!questionSource ? (
            <p className="note" style={{ marginTop: 0 }}>
              Choose draft questions or create your own to continue.
            </p>
          ) : null}

          <div className="actions">
            <button type="button" className="btn btn--ghost" onClick={() => go(0)}>
              Back
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={
                !questionSource ||
                (questionSource === 'custom' && !customQuestionsReady(customQuestions))
              }
              onClick={() => {
                void persist({
                  id: surveyId.startsWith('e3-') ? DEMO_DRAFT_ID : surveyId,
                  e3Id: null,
                  status: 'draft',
                  title,
                  windowValue,
                  windowUnit,
                  windowSeconds,
                  windowLabel,
                  questionSource: questionSource!,
                  questions: questionSource === 'custom' ? customQuestions : undefined,
                }).then(() => go(2))
              }}
            >
              Continue
            </button>
          </div>
        </StepPanel>
      )}

      {step === 2 && (
        <StepPanel
          kicker="Step 3 · Request E3"
          title="Request encrypted execution"
          lede="Approves mock USDC fee, then calls InterFold requestE3 with SurveyProgram. Needs InterFold program registration."
        >
          <div className="status-box">
            <strong>Contracts</strong>
            InterFold · <span className="mono">{shortAddr(SEPOLIA.contracts.interfold)}</span>
            <br />
            SurveyProgram · <span className="mono">{SEPOLIA.contracts.e3Program}</span>
          </div>
          {error ? <p className="note note--error">{error}</p> : null}
          {whitelistNote ? (
            <p className="note">
              Likely blocked until InterFold whitelists SurveyProgram. Send them{' '}
              <span className="mono">{SEPOLIA.contracts.e3Program}</span> (see Submit program).
            </p>
          ) : null}
          <div className="actions">
            <button type="button" className="btn btn--ghost" onClick={() => go(1)}>
              Back
            </button>
            <button type="button" className="btn btn--primary" disabled={busy || !sdk.isInitialized} onClick={requestE3}>
              {busy ? 'Requesting…' : 'Request E3'}
            </button>
          </div>
        </StepPanel>
      )}

      {step === 3 && (
        <StepPanel
          kicker="Step 4 · Collect"
          title={publicKey ? 'Committee ready' : 'Waiting for committee'}
          lede="Share the respond link once the committee publishes a public key. Sepolia DKG is slower than local. Round metadata is stored locally."
        >
          <div className="gauge-row">
            <div className="gauge">
              <p className="gauge__label">E3 id</p>
              <p className="gauge__value" style={{ fontSize: '1rem' }}>
                {e3Id ?? 'pending'}
              </p>
            </div>
            <div className="gauge">
              <p className="gauge__label">Window</p>
              <p className="gauge__value" style={{ fontSize: '1.1rem' }}>
                {windowLabel}
              </p>
            </div>
            <div className="gauge">
              <p className="gauge__label">Title</p>
              <p className="gauge__value" style={{ fontSize: '0.95rem', color: 'var(--text)' }}>
                {title}
              </p>
            </div>
          </div>
          {txHash ? (
            <div className="status-box">
              <strong>Request tx</strong>
              <a className="mono" href={`${SEPOLIA.explorer}/tx/${txHash}`} target="_blank" rel="noreferrer">
                {txHash}
              </a>
            </div>
          ) : null}
          <div className="status-box">
            <strong>Respond link</strong>
            <span className="mono">
              {typeof window !== 'undefined' ? window.location.origin : ''}
              {respondPath}
            </span>
          </div>
          <div className="actions">
            <button
              type="button"
              className="btn"
              disabled={!e3Id}
              onClick={() =>
                navigator.clipboard?.writeText(`${window.location.origin}${respondPath}`)
              }
            >
              Copy link
            </button>
            <button type="button" className="btn" onClick={() => void refreshOnChainResults()}>
              Refresh status
            </button>
            <button type="button" className="btn btn--primary" onClick={() => go(4)}>
              Results
            </button>
          </div>
        </StepPanel>
      )}

      {step === 4 && (
        <StepPanel
          kicker="Step 5 · Results"
          title="Per-question tallies"
          lede="Listens for PlaintextOutputPublished. Answers are CRISP-packed by question slot; FHE sum-all decrypts to one total per question (not per-student rows)."
        >
          <p className="note" style={{ marginTop: 0 }}>
            {resultsStatus}
          </p>
          <div className="gauge-row">
            <div className="gauge">
              <p className="gauge__label">Ciphertext inputs</p>
              <p className="gauge__value">{fmt(aggregates.inputCount, 0)}</p>
            </div>
            <div className="gauge">
              <p className="gauge__label">Est. respondents</p>
              <p className="gauge__value">{fmt(aggregates.estimatedRespondents, 0)}</p>
            </div>
          </div>
          {aggregates.questionTallies.length > 0 ? (
            <div className="status-box" style={{ display: 'grid', gap: '0.75rem' }}>
              <strong>Per-question results</strong>
              {aggregates.questionTallies.map((t) => (
                <div key={t.id} style={{ display: 'grid', gap: '0.15rem' }}>
                  <span>
                    Q{t.index}: {t.prompt}
                  </span>
                  <span className="mono">
                    sum={fmt(t.sum, 0)}
                    {t.kind === 'likert' ? ` · mean=${fmt(t.mean)}` : ''}
                    {t.kind === 'yesno' ? ` · yes≈${fmt(t.sum, 0)}` : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="status-box">
              <strong>Waiting for plaintext</strong>
              Once the committee decrypts, tallies appear here (CRISP decodeTally layout).
            </div>
          )}
          <div className="status-box">
            <strong>How to read this</strong>
            Each respondent publishes {QUESTIONS_PER_RESPONSE} ciphertexts (one per question), each packed
            into that question&apos;s binary segment. Homomorphic sum keeps slots separate — decrypt yields
            [Q0, Q1, Q2, Q3, Q4].
          </div>
          {aggregates.plaintextHex ? (
            <div className="status-box">
              <strong>Raw plaintext bytes</strong>
              <span className="mono">{aggregates.plaintextHex}</span>
            </div>
          ) : null}
          <div className="actions">
            <button type="button" className="btn btn--ghost" onClick={() => go(3)}>
              Back
            </button>
            <button type="button" className="btn btn--primary" onClick={() => void refreshOnChainResults()}>
              Fetch latest
            </button>
          </div>
        </StepPanel>
      )}
    </div>
  )
}

import { SCHEMA_VERSION } from '../data/questions'

const DB_NAME = 'education-survey'
const DB_VERSION = 1
const STORE = 'surveys'

export type SurveyStatus = 'draft' | 'requested' | 'collecting' | 'complete'

export type StoredSurvey = {
  /** IndexedDB key — e3Id when live, or a stable draft id */
  id: string
  e3Id: string | null
  title: string
  windowValue: number
  windowUnit: 'minutes' | 'hours'
  windowSeconds: number
  windowLabel: string
  schemaVersion: string
  /** draft = app template · custom = researcher-authored prompts (still 5 integers on-chain) */
  questionSource?: 'draft' | 'custom'
  questions?: import('../data/questions').SurveyQuestion[]
  status: SurveyStatus
  txHash: string | null
  publicKey: string | null
  plaintextSum: number | null
  plaintextHex: string | null
  inputCount: number | null
  createdAt: number
  updatedAt: number
}

export const DEMO_DRAFT_ID = 'demo-spring-2026'

export function demoDraftSurvey(): StoredSurvey {
  const now = Date.now()
  return {
    id: DEMO_DRAFT_ID,
    e3Id: null,
    title: 'Spring 2026 course feedback',
    windowValue: 48,
    windowUnit: 'hours',
    windowSeconds: 48 * 3600,
    windowLabel: '48 hours',
    schemaVersion: SCHEMA_VERSION,
    questionSource: undefined,
    questions: undefined,
    status: 'draft',
    txHash: null,
    publicKey: null,
    plaintextSum: null,
    plaintextHex: null,
    inputCount: null,
    createdAt: now,
    updatedAt: now,
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('e3Id', 'e3Id', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
    }
  })
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
  })
}

export async function putSurvey(survey: StoredSurvey): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    await reqToPromise(tx.objectStore(STORE).put({ ...survey, updatedAt: Date.now() }))
  } finally {
    db.close()
  }
}

export async function getSurvey(id: string): Promise<StoredSurvey | undefined> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readonly')
    return (await reqToPromise(tx.objectStore(STORE).get(id))) as StoredSurvey | undefined
  } finally {
    db.close()
  }
}

export async function getSurveyByE3Id(e3Id: string): Promise<StoredSurvey | undefined> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readonly')
    const idx = tx.objectStore(STORE).index('e3Id')
    return (await reqToPromise(idx.get(e3Id))) as StoredSurvey | undefined
  } finally {
    db.close()
  }
}

export async function listSurveys(): Promise<StoredSurvey[]> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readonly')
    const all = (await reqToPromise(tx.objectStore(STORE).getAll())) as StoredSurvey[]
    return all.sort((a, b) => b.updatedAt - a.updatedAt)
  } finally {
    db.close()
  }
}

/** Ensure the Spring 2026 demo template exists for local demos. */
export async function ensureDemoDraft(): Promise<StoredSurvey> {
  const existing = await getSurvey(DEMO_DRAFT_ID)
  if (existing) return existing
  const draft = demoDraftSurvey()
  await putSurvey(draft)
  return draft
}

export function windowLabelFrom(value: number, unit: 'minutes' | 'hours') {
  if (unit === 'hours') return `${value} ${value === 1 ? 'hour' : 'hours'}`
  return `${value} ${value === 1 ? 'minute' : 'minutes'}`
}

export function respondPathFor(e3Id: string | null) {
  const q = new URLSearchParams()
  if (e3Id) q.set('e3', e3Id)
  return `/respond?${q.toString()}`
}

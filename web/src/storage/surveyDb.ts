/**
 * Survey metadata store — Supabase only (Create writes; Respond loads by e3_id).
 */
import { SCHEMA_VERSION } from '../data/questions'
import { getSupabase } from '../lib/supabase'
import type { SurveyQuestion } from '../data/questions'

export type SurveyStatus = 'ready' | 'requested' | 'collecting' | 'complete'

export type StoredSurvey = {
  id: string
  e3Id: string | null
  title: string
  windowValue: number
  windowUnit: 'minutes' | 'hours'
  windowSeconds: number
  windowLabel: string
  schemaVersion: string
  questions: SurveyQuestion[]
  status: SurveyStatus
  txHash: string | null
  publicKey: string | null
  plaintextSum: number | null
  plaintextHex: string | null
  inputCount: number | null
  createdAt: number
  updatedAt: number
}

type SurveyRow = {
  id: string
  e3_id: string | null
  title: string
  window_value: number
  window_unit: 'minutes' | 'hours'
  window_seconds: number
  window_label: string
  schema_version: string
  questions: SurveyQuestion[]
  status: SurveyStatus
  tx_hash: string | null
  public_key: string | null
  plaintext_sum: number | null
  plaintext_hex: string | null
  input_count: number | null
  created_at: string
  updated_at: string
}

function toRow(survey: StoredSurvey): SurveyRow {
  const updated = new Date(survey.updatedAt || Date.now()).toISOString()
  const created = new Date(survey.createdAt || Date.now()).toISOString()
  return {
    id: survey.id,
    e3_id: survey.e3Id,
    title: survey.title,
    window_value: survey.windowValue,
    window_unit: survey.windowUnit,
    window_seconds: survey.windowSeconds,
    window_label: survey.windowLabel,
    schema_version: survey.schemaVersion,
    questions: survey.questions,
    status: survey.status,
    tx_hash: survey.txHash,
    public_key: survey.publicKey,
    plaintext_sum: survey.plaintextSum,
    plaintext_hex: survey.plaintextHex,
    input_count: survey.inputCount,
    created_at: created,
    updated_at: updated,
  }
}

function fromRow(row: SurveyRow): StoredSurvey {
  return {
    id: row.id,
    e3Id: row.e3_id,
    title: row.title,
    windowValue: row.window_value,
    windowUnit: row.window_unit,
    windowSeconds: row.window_seconds,
    windowLabel: row.window_label,
    schemaVersion: row.schema_version,
    questions: row.questions ?? [],
    status: row.status,
    txHash: row.tx_hash,
    publicKey: row.public_key,
    plaintextSum: row.plaintext_sum,
    plaintextHex: row.plaintext_hex,
    inputCount: row.input_count,
    createdAt: Date.parse(row.created_at) || Date.now(),
    updatedAt: Date.parse(row.updated_at) || Date.now(),
  }
}

export function newSurveyId(): string {
  return `survey-${crypto.randomUUID()}`
}

export async function putSurvey(survey: StoredSurvey): Promise<void> {
  const next = { ...survey, updatedAt: Date.now(), schemaVersion: SCHEMA_VERSION }
  const prev = await getSurvey(survey.id).catch(() => undefined)
  const row = toRow({
    ...next,
    createdAt: prev?.createdAt ?? survey.createdAt ?? Date.now(),
  })
  const { error } = await getSupabase().from('surveys').upsert(row, { onConflict: 'id' })
  if (error) throw new Error(`Supabase putSurvey failed: ${error.message}`)
}

export async function getSurvey(id: string): Promise<StoredSurvey | undefined> {
  const { data, error } = await getSupabase().from('surveys').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Supabase getSurvey failed: ${error.message}`)
  return data ? fromRow(data as SurveyRow) : undefined
}

export async function getSurveyByE3Id(e3Id: string): Promise<StoredSurvey | undefined> {
  const { data, error } = await getSupabase()
    .from('surveys')
    .select('*')
    .eq('e3_id', e3Id)
    .maybeSingle()
  if (error) throw new Error(`Supabase getSurveyByE3Id failed: ${error.message}`)
  return data ? fromRow(data as SurveyRow) : undefined
}

export async function listSurveys(): Promise<StoredSurvey[]> {
  const { data, error } = await getSupabase()
    .from('surveys')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw new Error(`Supabase listSurveys failed: ${error.message}`)
  return (data as SurveyRow[]).map(fromRow)
}

/** Surveys that have an on-chain e3 id (ready for Respond). */
export async function listRespondableSurveys(): Promise<StoredSurvey[]> {
  const { data, error } = await getSupabase()
    .from('surveys')
    .select('*')
    .not('e3_id', 'is', null)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(`Supabase listRespondableSurveys failed: ${error.message}`)
  return (data as SurveyRow[]).map(fromRow)
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

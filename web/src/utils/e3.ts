import { encodeAbiParameters, keccak256, toBytes, type PublicClient } from 'viem'

/** Match template: ABI-encode compute provider params blob. */
export function encodeComputeProviderParams(params: { name: string; version: string } = { name: 'survey', version: '1' }) {
  return encodeAbiParameters(
    [{ type: 'string' }, { type: 'string' }],
    [params.name, params.version],
  )
}

export function schemaHash() {
  return keccak256(toBytes('education-survey-v1'))
}

export async function calculateInputWindow(publicClient: PublicClient, durationSeconds: number) {
  const block = await publicClient.getBlock({ blockTag: 'latest' })
  const now = Number(block.timestamp)
  const start = BigInt(now + 30)
  const end = BigInt(now + 30 + durationSeconds)
  return [start, end] as const
}

/** Pack Likert answers for encryption pipeline (ints). */
export function packAnswers(answers: Record<string, number | null>): number[] {
  return Object.values(answers).map((v) => {
    if (v === null || v === undefined) throw new Error('Incomplete answers')
    return v
  })
}

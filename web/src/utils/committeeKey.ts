import { decodeEventLog, type Log } from 'viem'
import type { InterfoldSDK } from '@interfold/sdk'
import { RegistryEventType } from '@interfold/sdk'
import { getSurveyByE3Id } from '../storage/surveyDb'
import { hexToBytes, toHex } from './publishInput'

/**
 * Resolve the BFV public key bytes used for encryption.
 *
 * Docs / InterFold: `getE3().committeePublicKey` and registry `committeePublicKey`
 * are the **pk commitment** (bytes32). The serialized key is only in
 * `CommitteePublished.publicKey` and must be checked with
 * `validatePublicKeyCommitment` before encrypting.
 */
export async function resolveCommitteeEncryptionKey(
  sdk: InterfoldSDK,
  e3Id: bigint,
): Promise<{ publicKey: Uint8Array; pkCommitment: `0x${string}` }> {
  const e3 = await sdk.getE3(e3Id)
  const pkCommitment = e3.committeePublicKey as `0x${string}`
  if (!pkCommitment || pkCommitment === '0x') {
    throw new Error('Committee public key commitment not published yet')
  }

  const stored = await getSurveyByE3Id(e3Id.toString()).catch(() => undefined)
  if (stored?.publicKey && stored.publicKey.length > 66) {
    const publicKey = hexToBytes(stored.publicKey as `0x${string}`)
    const ok = await sdk.validatePublicKeyCommitment(publicKey, hexToBytes(pkCommitment))
    if (ok) return { publicKey, pkCommitment }
  }

  const fromEvent = await fetchCommitteePublicKeyFromLogs(sdk, e3Id)
  if (fromEvent) {
    const ok = await sdk.validatePublicKeyCommitment(fromEvent, hexToBytes(pkCommitment))
    if (!ok) {
      throw new Error(
        'CommitteePublished.publicKey does not match on-chain pk commitment — refusing to encrypt',
      )
    }
    return { publicKey: fromEvent, pkCommitment }
  }

  throw new Error(
    'Could not find CommitteePublished.publicKey for this E3. Open the researcher link after the committee publishes, or ensure the round is still queryable on Sepolia.',
  )
}

async function fetchCommitteePublicKeyFromLogs(
  sdk: InterfoldSDK,
  e3Id: bigint,
): Promise<Uint8Array | null> {
  // Sepolia public RPCs often cap eth_getLogs ranges; scan recent windows.
  const publicClient = sdk.getPublicClient()
  const latest = await publicClient.getBlockNumber()
  const window = 50_000n
  let toBlock = latest

  for (let i = 0; i < 8; i++) {
    const fromBlock = toBlock > window ? toBlock - window + 1n : 0n
    const logs = await sdk.getHistoricalEvents(
      RegistryEventType.COMMITTEE_PUBLISHED,
      fromBlock,
      toBlock,
    )
    const match = findPublicKeyInLogs(logs, e3Id)
    if (match) return match
    if (fromBlock === 0n) break
    toBlock = fromBlock - 1n
  }
  return null
}

function findPublicKeyInLogs(logs: Log[], e3Id: bigint): Uint8Array | null {
  for (const log of logs) {
    const maybeArgs = (log as Log & { args?: { e3Id?: bigint; publicKey?: `0x${string}` } }).args
    if (maybeArgs?.e3Id === e3Id && maybeArgs.publicKey && maybeArgs.publicKey !== '0x') {
      return hexToBytes(maybeArgs.publicKey)
    }
    try {
      const decoded = decodeEventLog({
        abi: [
          {
            type: 'event',
            name: 'CommitteePublished',
            inputs: [
              { name: 'e3Id', type: 'uint256', indexed: true },
              { name: 'nodes', type: 'address[]', indexed: false },
              { name: 'publicKey', type: 'bytes', indexed: false },
              { name: 'pkCommitment', type: 'bytes32', indexed: false },
              { name: 'proof', type: 'bytes', indexed: false },
            ],
          },
        ] as const,
        data: log.data,
        topics: log.topics,
      })
      if (decoded.eventName !== 'CommitteePublished') continue
      const args = decoded.args as {
        e3Id: bigint
        publicKey: `0x${string}`
      }
      if (args.e3Id !== e3Id) continue
      if (!args.publicKey || args.publicKey === '0x') continue
      return hexToBytes(args.publicKey)
    } catch {
      // try next log
    }
  }
  return null
}

export function commitmentHex(bytes: Uint8Array): `0x${string}` {
  return toHex(bytes)
}

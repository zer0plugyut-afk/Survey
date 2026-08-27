/**
 * Client survey_fold proving — InterFold docs path:
 *
 *   encryptNumberAndGenInputs (SDK WASM, preset from SEPOLIA config)
 *     → user_data_encryption_ct0 / ct1 / wrapper  (app-owned compiled circuits)
 *     → survey
 *     → survey_fold (keccak / EVM Honk for SurveyFoldVerifier)
 *
 * Do NOT use SDK `generateProof` — npm embeds N=512 UDE only. Use compiled JSON from
 * `CIRCUIT_PRESET=secure-8192` or `insecure-512` per docs / deployment (see PRESET.txt).
 */
import { Barretenberg, UltraHonkBackend, type ProofData } from '@aztec/bb.js'
import { Noir, type CompiledCircuit, type InputMap } from '@noir-lang/noir_js'
import {
  encryptNumberAndGenInputs,
  type EncryptedValueAndPublicInputs,
} from '@interfold/sdk/crypto'

type CircuitInputs = EncryptedValueAndPublicInputs['circuitInputs']

import udeCt0Circuit from '../circuits/user_data_encryption_ct0.json'
import udeCt1Circuit from '../circuits/user_data_encryption_ct1.json'
import userDataEncryptionCircuit from '../circuits/user_data_encryption.json'
import surveyCircuit from '../circuits/survey.json'
import surveyFoldCircuit from '../circuits/survey_fold.json'
import { SEPOLIA } from '../config/sepolia'
import { SCHEMA_ID, allowedRange, bytes32FromAddress } from './surveySchema'
import { toHex } from './publishInput'

const RECURSIVE = { verifierTarget: 'noir-recursive-no-zk' as const }
/** Matches `bb write_vk --oracle_hash keccak` + ZK Solidity verifier. */
const EVM = { verifierTarget: 'evm' as const }

/** Honk recursive proof / VK sizes from bb_proof_verification (fixed protocol layout). */
const UH_PROOF_FIELDS = 410
const UH_VK_FIELDS = 115

type Poly = { coefficients: string[] }
type StatusFn = (message: string) => void

function fieldHex(value: bigint | number | string): string {
  if (typeof value === 'string') {
    const hex = value.startsWith('0x') ? value.slice(2) : value
    return `0x${hex.padStart(64, '0')}`
  }
  return `0x${BigInt(value).toString(16).padStart(64, '0')}`
}

function proofToFields(proof: Uint8Array): string[] {
  const fields: string[] = []
  for (let i = 0; i < proof.length; i += 32) {
    fields.push(toHex(proof.slice(i, i + 32)))
  }
  return fields
}

function asPoly(value: unknown, label: string): Poly {
  if (value && typeof value === 'object' && 'coefficients' in value) {
    const coeffs = (value as Poly).coefficients
    if (!Array.isArray(coeffs)) throw new Error(`${label}: missing coefficients`)
    return { coefficients: coeffs.map(String) }
  }
  if (Array.isArray(value)) {
    return { coefficients: value.map(String) }
  }
  throw new Error(`${label}: expected Polynomial or field array`)
}

function asPolyArray(value: unknown, label: string): Poly[] {
  if (!Array.isArray(value)) throw new Error(`${label}: expected array`)
  return value.map((item, i) => asPoly(item, `${label}[${i}]`))
}

/** SDK CircuitInputs → Noir Polynomial structs (same shape as InterFold generateProof). */
function udeCt0Inputs(circuitInputs: CircuitInputs): InputMap {
  return {
    pk0is: asPolyArray(circuitInputs.pk0is, 'pk0is'),
    ct0is: asPolyArray(circuitInputs.ct0is, 'ct0is'),
    u: asPoly(circuitInputs.u, 'u'),
    e0: asPoly(circuitInputs.e0, 'e0'),
    e0is: asPolyArray(circuitInputs.e0is, 'e0is'),
    e0_quotients: asPolyArray(circuitInputs.e0_quotients, 'e0_quotients'),
    k1: asPoly(circuitInputs.k1, 'k1'),
    r1is: asPolyArray(circuitInputs.r1is, 'r1is'),
    r2is: asPolyArray(circuitInputs.r2is, 'r2is'),
  }
}

function udeCt1Inputs(circuitInputs: CircuitInputs): InputMap {
  return {
    pk1is: asPolyArray(circuitInputs.pk1is, 'pk1is'),
    ct1is: asPolyArray(circuitInputs.ct1is, 'ct1is'),
    u: asPoly(circuitInputs.u, 'u'),
    e1: asPoly(circuitInputs.e1, 'e1'),
    p1is: asPolyArray(circuitInputs.p1is, 'p1is'),
    p2is: asPolyArray(circuitInputs.p2is, 'p2is'),
  }
}

function surveyWitnessFromCircuitInputs(
  circuitInputs: CircuitInputs,
  respondent: `0x${string}`,
  questionIndex: number,
): InputMap {
  const [min, max] = allowedRange(questionIndex)
  return {
    ct0is: asPolyArray(circuitInputs.ct0is, 'ct0is'),
    ct1is: asPolyArray(circuitInputs.ct1is, 'ct1is'),
    k1: asPoly(circuitInputs.k1, 'k1'),
    schema_id: SCHEMA_ID,
    respondent: bytes32FromAddress(respondent),
    question_index: fieldHex(questionIndex),
    min_value: fieldHex(min),
    max_value: fieldHex(max),
  }
}

async function executeCircuit(circuit: CompiledCircuit, inputs: InputMap) {
  const noir = new Noir(circuit)
  return noir.execute(inputs)
}

async function recursiveArtifacts(
  backend: UltraHonkBackend,
  proof: Uint8Array,
  numPublicInputs: number,
) {
  return backend.generateRecursiveProofArtifacts(proof, numPublicInputs, RECURSIVE)
}

function commitmentBytes(hex: string): Uint8Array {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex
  const out = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    out[i] = Number.parseInt(h.slice(i * 2, i * 2 + 2) || '00', 16)
  }
  return out
}

function assertProofFields(label: string, proof: Uint8Array) {
  const n = proofToFields(proof).length
  if (n !== UH_PROOF_FIELDS) {
    throw new Error(`${label} UltraHonkProof length ${n}, expected ${UH_PROOF_FIELDS}`)
  }
}

export type SurveyFoldProofResult = {
  ciphertext: Uint8Array
  commitment: Uint8Array
  proof: `0x${string}`
  publicInputs: `0x${string}`[]
}

/**
 * Full client path for one survey answer under the configured BFV preset.
 */
export async function generateSurveyFoldProof(args: {
  value: bigint
  publicKey: Uint8Array
  respondent: `0x${string}`
  questionIndex: number
  onStatus?: StatusFn
}): Promise<SurveyFoldProofResult> {
  const { value, publicKey, respondent, questionIndex, onStatus } = args
  const preset = SEPOLIA.thresholdBfvParamsPresetName
  if (
    preset !== 'SECURE_THRESHOLD_8192' &&
    preset !== 'INSECURE_THRESHOLD_512'
  ) {
    throw new Error(`Unsupported BFV preset for survey fold: ${preset}`)
  }
  const status = onStatus ?? (() => {})

  status('Encrypting answer + GRECO circuit inputs (secure-8192)…')
  const { encryptedData, circuitInputs } = await encryptNumberAndGenInputs(
    value,
    publicKey,
    preset,
  )

  const api = await Barretenberg.new()
  try {
    // Secure circuits are large; keep Chonk SRS sized like InterFold SDK.
    await api.initSRSChonk(2 ** 21)

    const ct0Backend = new UltraHonkBackend((udeCt0Circuit as CompiledCircuit).bytecode, api)
    const ct1Backend = new UltraHonkBackend((udeCt1Circuit as CompiledCircuit).bytecode, api)
    const udeBackend = new UltraHonkBackend(
      (userDataEncryptionCircuit as CompiledCircuit).bytecode,
      api,
    )
    const surveyBackend = new UltraHonkBackend((surveyCircuit as CompiledCircuit).bytecode, api)
    const foldBackend = new UltraHonkBackend((surveyFoldCircuit as CompiledCircuit).bytecode, api)

    status('Proving user_data_encryption_ct0…')
    const { witness: ct0Witness } = await executeCircuit(
      udeCt0Circuit as CompiledCircuit,
      udeCt0Inputs(circuitInputs),
    )
    const ct0Proof = await ct0Backend.generateProof(ct0Witness, RECURSIVE)
    const ct0Artifacts = await recursiveArtifacts(ct0Backend, ct0Proof.proof, ct0Proof.publicInputs.length)

    status('Proving user_data_encryption_ct1…')
    const { witness: ct1Witness } = await executeCircuit(
      udeCt1Circuit as CompiledCircuit,
      udeCt1Inputs(circuitInputs),
    )
    const ct1Proof = await ct1Backend.generateProof(ct1Witness, RECURSIVE)
    const ct1Artifacts = await recursiveArtifacts(ct1Backend, ct1Proof.proof, ct1Proof.publicInputs.length)

    status('Proving user_data_encryption wrapper…')
    const { witness: udeWitness } = await executeCircuit(userDataEncryptionCircuit as CompiledCircuit, {
      ct0_verification_key: ct0Artifacts.vkAsFields,
      ct0_proof: proofToFields(ct0Proof.proof),
      ct0_public_inputs: ct0Proof.publicInputs,
      ct0_key_hash: ct0Artifacts.vkHash,
      ct1_verification_key: ct1Artifacts.vkAsFields,
      ct1_proof: proofToFields(ct1Proof.proof),
      ct1_public_inputs: ct1Proof.publicInputs,
      ct1_key_hash: ct1Artifacts.vkHash,
    })
    const udeProof: ProofData = await udeBackend.generateProof(udeWitness, RECURSIVE)
    if (udeProof.publicInputs.length !== 5) {
      throw new Error(
        `user_data_encryption expected 5 public inputs, got ${udeProof.publicInputs.length}`,
      )
    }
    assertProofFields('UDE', udeProof.proof)
    const udeArtifacts = await recursiveArtifacts(udeBackend, udeProof.proof, udeProof.publicInputs.length)

    status('Proving survey (range + commitments)…')
    const surveyInputs = surveyWitnessFromCircuitInputs(circuitInputs, respondent, questionIndex)
    const { witness: surveyWitness } = await executeCircuit(
      surveyCircuit as CompiledCircuit,
      surveyInputs,
    )
    const surveyProof = await surveyBackend.generateProof(surveyWitness, RECURSIVE)
    if (surveyProof.publicInputs.length !== 7) {
      throw new Error(`survey expected 7 public inputs, got ${surveyProof.publicInputs.length}`)
    }
    assertProofFields('survey', surveyProof.proof)
    const surveyArtifacts = await recursiveArtifacts(
      surveyBackend,
      surveyProof.proof,
      surveyProof.publicInputs.length,
    )

    const ctCommitment = surveyProof.publicInputs[5]
    const k1Commitment = surveyProof.publicInputs[6]
    const pkCommitment = udeProof.publicInputs[2]

    if (ctCommitment !== udeProof.publicInputs[3]) {
      throw new Error('ct_commitment mismatch between survey and user_data_encryption')
    }
    if (k1Commitment !== udeProof.publicInputs[4]) {
      throw new Error('k1_commitment mismatch between survey and user_data_encryption')
    }

    status('Proving survey_fold (recursive verify + keccak EVM proof)…')
    const [min, max] = allowedRange(questionIndex)
    if (udeArtifacts.vkAsFields.length !== UH_VK_FIELDS || surveyArtifacts.vkAsFields.length !== UH_VK_FIELDS) {
      throw new Error(`UltraHonkVerificationKey must be ${UH_VK_FIELDS} fields`)
    }

    const foldInputs: InputMap = {
      user_data_encryption_verification_key: udeArtifacts.vkAsFields,
      user_data_encryption_proof: proofToFields(udeProof.proof),
      user_data_encryption_public_inputs: udeProof.publicInputs,
      user_data_encryption_key_hash: udeArtifacts.vkHash,
      survey_verification_key: surveyArtifacts.vkAsFields,
      survey_proof: proofToFields(surveyProof.proof),
      survey_key_hash: surveyArtifacts.vkHash,
      schema_id: SCHEMA_ID,
      respondent: bytes32FromAddress(respondent),
      question_index: fieldHex(questionIndex),
      min_value: fieldHex(min),
      max_value: fieldHex(max),
      ct_commitment: ctCommitment,
      k1_commitment: k1Commitment,
    }

    const { witness: foldWitness } = await executeCircuit(
      surveyFoldCircuit as CompiledCircuit,
      foldInputs,
    )
    const foldProof = await foldBackend.generateProof(foldWitness, EVM)

    if (foldProof.publicInputs.length !== 7) {
      throw new Error(`survey_fold expected 7 public inputs, got ${foldProof.publicInputs.length}`)
    }

    const publicInputs = foldProof.publicInputs.map((x) => fieldHex(x)) as `0x${string}`[]

    if (publicInputs[6].toLowerCase() !== fieldHex(pkCommitment).toLowerCase()) {
      throw new Error('fold pk_commitment return does not match user_data_encryption')
    }
    if (publicInputs[5].toLowerCase() !== fieldHex(ctCommitment).toLowerCase()) {
      throw new Error('fold ct_commitment public input mismatch')
    }

    status('Fold proof ready (secure-8192)')
    return {
      ciphertext: encryptedData,
      commitment: commitmentBytes(ctCommitment),
      proof: toHex(foldProof.proof),
      publicInputs,
    }
  } finally {
    await api.destroy()
  }
}

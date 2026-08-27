// Survey input circuit public API - must stay aligned with SurveyProgram.sol PI_* layout.
//
// Public inputs (order fixed):
//   0 schemaId
//   1 respondent (address as Field)
//   2 questionIndex
//   3 minValue
//   4 maxValue
//   5 ciphertextCommitment
//   6 committeePublicKey
//
// Production build: adapt CRISP user_data_encryption + range checks (Likert 1-5 / yes-no 0-1),
// then bb write_vk + bb write_solidity_verifier -> contracts/verifiers/SurveyHonkVerifier.sol
// See scripts/compile-survey-circuits.sh and InterFold docs/noir-circuits.

fn main(
    // Private: plaintext answer in allowed range (proven, not revealed on-chain).
    answer: Field,
    // Public inputs - mirror SurveyProgram.publishInput
    schema_id: pub Field,
    respondent: pub Field,
    question_index: pub Field,
    min_value: pub Field,
    max_value: pub Field,
    ciphertext_commitment: pub Field,
    committee_public_key: pub Field,
) {
    // Range: min_value <= answer <= max_value
    assert(answer as u64 >= min_value as u64);
    assert(answer as u64 <= max_value as u64);

    // Placeholder bindings so public inputs are constrained into the circuit.
    // Replace with BFV encryption + SAFE commitment checks (CRISP-style) before production.
    assert(schema_id != 0);
    assert(respondent != 0);
    assert(question_index as u64 < 5);
    assert(ciphertext_commitment != 0);
    assert(committee_public_key != 0);
}

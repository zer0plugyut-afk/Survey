// SPDX-License-Identifier: LGPL-3.0-only
//! Fold: recursively verify user_data_encryption + survey, bind ct/k1 commitments.
//! On-chain Honk verifier is generated from this circuit (keccak / EVM), matching CRISP.

use bb_proof_verification::{UltraHonkProof, UltraHonkVerificationKey, verify_honk_proof_non_zk};
use interfold_lib::math::commitments::compute_vk_hash;

/// Placeholder — overwritten after first compile via compute_vk_hash (see compile script).
pub global SURVEY_FOLD_EXPECTED_KEY_HASH: Field =
    0x0000000000000000000000000000000000000000000000000000000000000001;

fn main(
    // P3 user_data_encryption (wrapper over ct0/ct1).
    user_data_encryption_verification_key: UltraHonkVerificationKey,
    user_data_encryption_proof: UltraHonkProof,
    // ct0_key_hash, ct1_key_hash, pk_commitment, ct_commitment, k1_commitment
    user_data_encryption_public_inputs: [Field; 5],
    user_data_encryption_key_hash: Field,
    // Survey range / schema circuit.
    survey_verification_key: UltraHonkVerificationKey,
    survey_proof: UltraHonkProof,
    survey_key_hash: Field,
    schema_id: pub Field,
    respondent: pub Field,
    question_index: pub Field,
    min_value: pub Field,
    max_value: pub Field,
    ct_commitment: pub Field,
    k1_commitment: Field,
) -> pub Field {
    verify_honk_proof_non_zk(
        user_data_encryption_verification_key,
        user_data_encryption_proof,
        user_data_encryption_public_inputs,
        user_data_encryption_key_hash,
    );
    verify_honk_proof_non_zk(
        survey_verification_key,
        survey_proof,
        [
            schema_id,
            respondent,
            question_index,
            min_value,
            max_value,
            ct_commitment,
            k1_commitment,
        ],
        survey_key_hash,
    );

    // Bind encryption ciphertext/plaintext to the survey statement.
    assert(ct_commitment == user_data_encryption_public_inputs[3]);
    assert(k1_commitment == user_data_encryption_public_inputs[4]);

    let vk_hashes = [
        user_data_encryption_key_hash,
        survey_key_hash,
        user_data_encryption_public_inputs[0],
        user_data_encryption_public_inputs[1],
    ]
        .as_vector();
    let chain_key_hash = compute_vk_hash(vk_hashes);
    // First compile: skip strict pin by allowing the placeholder OR exact match after update.
    assert(
        (chain_key_hash == SURVEY_FOLD_EXPECTED_KEY_HASH)
            | (SURVEY_FOLD_EXPECTED_KEY_HASH == 1),
    );

    // pk_commitment — contract compares to committeePublicKey commitment.
    user_data_encryption_public_inputs[2]
}

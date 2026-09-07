// SPDX-License-Identifier: LGPL-3.0-only
//! Survey input circuit: BFV ciphertext/plaintext commitments + allowed-value range.
//! Folded with `user_data_encryption` (see `survey_fold`) so the on-chain proof shows
//! encryption under the committee key AND that the plaintext is in [min, max].

use interfold_lib::configs::default::threshold::{
    L, N, USER_DATA_ENCRYPTION_BIT_CT, USER_DATA_ENCRYPTION_BIT_K,
};
use interfold_lib::math::{
    commitments::{
        compute_ciphertext_commitment, compute_single_polynomial_commitment,
        DS_USER_DATA_ENCRYPTION_COMMITMENT,
    },
    polynomial::Polynomial,
};
use survey_lib::range::assert_packed_answer_in_range;

fn main(
    // Ciphertext + plaintext (same witness family as Greco / user_data_encryption).
    ct0is: [Polynomial<N>; L],
    ct1is: [Polynomial<N>; L],
    k1: Polynomial<N>,
    // Bound to SurveyProgram.publishInput public inputs.
    schema_id: pub Field,
    respondent: pub Field,
    question_index: pub Field,
    min_value: pub Field,
    max_value: pub Field,
) -> pub (Field, Field) {
    let ct_commitment =
        compute_ciphertext_commitment::<N, L, USER_DATA_ENCRYPTION_BIT_CT>(ct0is, ct1is);
    let k1_commitment = compute_single_polynomial_commitment::<N, USER_DATA_ENCRYPTION_BIT_K>(
        k1,
        DS_USER_DATA_ENCRYPTION_COMMITMENT,
    );

    assert(schema_id != 0);
    assert(respondent != 0);
    assert((question_index as u64) < 5);

    // CRISP-style packing: answer lives in the question_index binary segment.
    assert_packed_answer_in_range(
        k1,
        question_index as u64,
        min_value as u64,
        max_value as u64,
    );

    (ct_commitment, k1_commitment)
}

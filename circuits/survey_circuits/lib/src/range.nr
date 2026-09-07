// SPDX-License-Identifier: LGPL-3.0-only
//! Survey plaintext packing — same layout as CRISP `encodeVote` / `decodeTally`
//! (docs + `examples/CRISP/packages/crisp-sdk/src/encoding.ts`).
//!
//! Each answer ciphertext is a sparse ballot: only the segment for `question_index`
//! is non-zero. Homomorphic sum-all then decrypts to per-question tallies.

use interfold_lib::configs::default::MAX_MSG_NON_ZERO_COEFFS;
use interfold_lib::configs::default::threshold::{N, Q_MOD_T_CENTERED};
use interfold_lib::math::polynomial::Polynomial;

use crate::constants::{MAX_OPTIONS, MAX_VOTE_BITS};

/// Fixed packing width (must match SurveyProgram.QUESTION_COUNT). Surveys may use fewer slots.
global QUESTION_COUNT: u32 = 20;

/// CRISP ballot layout inside reversed `k1` (see crisp-sdk encoding + crisp_lib utils).
fn ballot_layout<let D: u32>(num_options: u32) -> (u32, u32) {
    assert(num_options > 1);
    assert(num_options as u64 <= MAX_OPTIONS as u64);
    assert(D >= MAX_MSG_NON_ZERO_COEFFS);

    let segment_size: u32 = MAX_MSG_NON_ZERO_COEFFS / num_options;
    let pad: u32 = MAX_MSG_NON_ZERO_COEFFS - (segment_size * num_options);

    (D - MAX_MSG_NON_ZERO_COEFFS + pad, segment_size)
}

fn check_prefix_zero<let D: u32>(k1: Polynomial<D>, base: u32) -> bool {
    let mut valid = true;
    for i in 0..D {
        if i < base {
            valid = valid & (k1.coefficients[i] == 0);
        }
    }
    valid
}

/// Prove plaintext is a CRISP-packed sparse answer for one question.
///
/// - Binary digits in each option segment (0 or `Q_MOD_T_CENTERED`)
/// - Only `question_index` may be non-zero
/// - That option's integer value is in `[min_value, max_value]`
/// - Everything outside the ballot region is zero
pub fn assert_packed_answer_in_range(k1: Polynomial<N>, question_index: u64, min_value: u64, max_value: u64) {
    assert(min_value <= max_value);
    assert(max_value < 100);
    assert(question_index < (QUESTION_COUNT as u64));

    let one = Q_MOD_T_CENTERED;
    let (base, segment_size) = ballot_layout::<N>(QUESTION_COUNT);
    assert(check_prefix_zero(k1, base));

    let mut matched_question = false;

    for opt_idx in 0..MAX_OPTIONS {
        if (opt_idx as u64) < (QUESTION_COUNT as u64) {
            // Reversal: option `opt_idx` sits at segment `QUESTION_COUNT - 1 - opt_idx`.
            let circuit_segment: u32 = QUESTION_COUNT - 1 - opt_idx;
            let start_idx: u32 = base + (circuit_segment * segment_size);

            let mut sum: u64 = 0;
            for bit_pos in 0..MAX_VOTE_BITS {
                if (bit_pos as u64) < (segment_size as u64) {
                    let idx: u32 = start_idx + bit_pos;
                    let coeff = k1.coefficients[idx];
                    // Binary: 0 or one
                    assert(0 == coeff * (one - coeff));
                    let bit: u64 = if coeff == 0 { 0 } else { 1 };
                    // LSB first in circuit (matches CRISP utils)
                    sum += bit * (1 << (bit_pos as u64));
                }
            }

            if (opt_idx as u64) == question_index {
                assert(sum >= min_value);
                assert(sum <= max_value);
                matched_question = true;
            } else {
                assert(sum == 0);
            }
        }
    }

    assert(matched_question);
}

// SPDX-License-Identifier: LGPL-3.0-only
//! Survey helpers: decode BFV plaintext poly from `encryptNumber` and range-check.

use interfold_lib::configs::default::MAX_MSG_NON_ZERO_COEFFS;
use interfold_lib::configs::default::threshold::{N, Q_MOD_T_CENTERED};
use interfold_lib::math::polynomial::Polynomial;

/// `encryptNumber` places the integer message in the BFV constant term.
/// Circuit `k1` is reversed, so that term sits at index `N - 1`.
/// Value `a` is encoded as `a * Q_MOD_T_CENTERED` (with `0` as `0`).
pub fn assert_number_in_range(k1: Polynomial<N>, min_value: u64, max_value: u64) {
    assert(min_value <= max_value);
    assert(max_value < 100); // PLAINTEXT_MODULUS for insecure-512 / typical t

    let one = Q_MOD_T_CENTERED;
    let msg_coeff = k1.coefficients[N - 1];

    // Exactly one legal answer matches the constant-term encoding.
    let mut matched = false;
    for a in 0..100 {
        let a_u = a as u64;
        if (a_u >= min_value) & (a_u <= max_value) {
            let expected = if a_u == 0 { 0 } else { one * (a as Field) };
            matched = matched | (msg_coeff == expected);
        }
    }
    assert(matched);

    // No extra payload in the message region (same discipline as CRISP ballots).
    let base: u32 = N - MAX_MSG_NON_ZERO_COEFFS;
    for i in 0..N {
        if (i >= base) & (i != (N - 1)) {
            assert(k1.coefficients[i] == 0);
        }
        if i < base {
            assert(k1.coefficients[i] == 0);
        }
    }
}

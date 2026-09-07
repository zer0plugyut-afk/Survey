// SPDX-License-Identifier: LGPL-3.0-only
//
// This file is provided WITHOUT ANY WARRANTY;
// without even the implied warranty of MERCHANTABILITY
// or FITNESS FOR A PARTICULAR PURPOSE.

/// Maximum number of options / question slots for a packed ballot.
/// Compile-time loop bound — must be >= SurveyProgram.QUESTION_COUNT.
pub global MAX_OPTIONS: u32 = 20;

// This constant defines the size of the coefficient region allocated for encoding vote amounts
/// in binary format within each half of the polynomial. Votes are encoded as binary numbers.
pub global MAX_VOTE_BITS: u32 = 50;

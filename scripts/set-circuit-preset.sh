#!/usr/bin/env bash
# Switch InterFold circuits/lib default config to secure-8192 (docs Sepolia / production).
# Sparse checkout has no build-circuits.ts — mirror what that script writes into default/mod.nr.
set -euo pipefail
REPO="${INTERFOLD_REPO:-/home/wilder/tmp/interfold-crisp/repo}"
PRESET="${1:-secure-8192}"
MOD="$REPO/circuits/lib/src/configs/default/mod.nr"

case "$PRESET" in
  secure-8192|secure)
    cat >"$MOD" <<'EOF'
// SPDX-License-Identifier: LGPL-3.0-only
//
// This file is provided WITHOUT ANY WARRANTY;
// without even the implied warranty of MERCHANTABILITY
// or FITNESS FOR A PARTICULAR PURPOSE.
//
// Auto-generated for preset: secure-8192 (Sepolia / production — docs recommendation)

// Committee size (N_PARTIES / T / H) is routed through `committee::active`.
pub use super::committee::active::{H, N_PARTIES, T};
pub use super::secure::dkg;
pub use super::secure::threshold;

/// Max number of non-zero coefficients in the message polynomial.
/// This is a conservative estimate that should be okay for most use cases.
pub global MAX_MSG_NON_ZERO_COEFFS: u32 = 100;
EOF
    ;;
  insecure-512|insecure)
    cat >"$MOD" <<'EOF'
// SPDX-License-Identifier: LGPL-3.0-only
//
// This file is provided WITHOUT ANY WARRANTY;
// without even the implied warranty of MERCHANTABILITY
// or FITNESS FOR A PARTICULAR PURPOSE.
//
// Auto-generated for preset: insecure-512 (local / fast only)

pub use super::committee::active::{H, N_PARTIES, T};
pub use super::insecure::dkg;
pub use super::insecure::threshold;

pub global MAX_MSG_NON_ZERO_COEFFS: u32 = 100;
EOF
    ;;
  *)
    echo "Usage: $0 [secure-8192|insecure-512]" >&2
    exit 1
    ;;
esac

echo "Wrote $MOD"
grep -E 'preset:|pub use super::(secure|insecure)::threshold' "$MOD"
echo "N/L from active threshold:"
# Resolve via nargo would be ideal; print secure constants when secure selected
if grep -q 'secure::threshold' "$MOD"; then
  grep -E 'pub global (N|L):' "$REPO/circuits/lib/src/configs/secure/threshold.nr" | head -2
else
  grep -E 'pub global (N|L):' "$REPO/circuits/lib/src/configs/insecure/threshold.nr" | head -2
fi

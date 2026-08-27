#!/usr/bin/env bash
# Compile the RISC Zero guest via Docker (e3-support) and sync ImageID.sol into this repo.
# Requires: Docker Desktop (WSL2), interfold CLI, guest project at ~/survey-e3 (or GUEST_DIR).
set -euo pipefail
export HOME="${HOME:-/home/wilder}"
export PATH="$HOME/.risc0/bin:$HOME/.foundry/bin:$HOME/.local/bin:$HOME/.cargo/bin:$HOME/.interfold/noir/bin:/usr/bin:/bin:$PATH"
[ -f "$HOME/.risc0/env" ] && . "$HOME/.risc0/env"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GUEST_DIR="${GUEST_DIR:-$HOME/survey-e3}"
REV="$(interfold rev)"
IMAGE="ghcr.io/gnosisguild/e3-support"

echo "CLI rev=$REV"
echo "Guest=$GUEST_DIR"
echo "Repo=$ROOT"

docker pull "$IMAGE:latest"
docker tag "$IMAGE:latest" "$IMAGE:$REV"
docker image inspect "$IMAGE:$REV" >/dev/null

cd "$GUEST_DIR"
echo "=== ImageID before ==="
cat .interfold/generated/contracts/ImageID.sol

.interfold/support/ctl/compile

echo "=== ImageID after ==="
cat .interfold/generated/contracts/ImageID.sol
cp -f .interfold/generated/contracts/ImageID.sol "$ROOT/contracts/ImageID.sol"
mkdir -p "$ROOT/contracts/generated"
cp -a .interfold/generated/contracts/. "$ROOT/contracts/generated/" 2>/dev/null || true
echo "Synced ImageID → $ROOT/contracts/ImageID.sol"
echo COMPILE_GUEST_DONE

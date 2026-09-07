#!/usr/bin/env bash
set -euo pipefail
cd "/mnt/e/DECRYPT/FOLD/food contracts/survey"

git add \
  README.md \
  circuits \
  contracts \
  deployments \
  scripts \
  web/.env.example \
  web/package-lock.json \
  web/package.json \
  web/src \
  web/supabase

git status --short

git commit -m "Raise survey capacity to 20 and use Supabase for create/respond metadata." -m "Drops IndexedDB and draft templates, redeploys for free Likert/yes-no per slot, lists live surveys on Respond, and fixes Create gating when the admin wallet is already connected."

git push -u origin HEAD
git status -sb
echo COMMIT_PUSH_DONE

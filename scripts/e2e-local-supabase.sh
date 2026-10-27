#!/usr/bin/env bash
# ponytail: mirrors .github/workflows/e2e.yml so `pnpm run e2e` works locally
# without stepping on .env (which points at production for `pnpm dev`).
set -euo pipefail

if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
  supabase start >/dev/null
  eval "$(supabase status -o env | grep -E '^(API_URL|PUBLISHABLE_KEY)=')"
  export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
  export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY"
fi

export FIELD_ENCRYPTION_KEY="${FIELD_ENCRYPTION_KEY:-$(openssl rand -base64 32)}"

exec playwright test "$@"

#!/usr/bin/env bash
# Lightweight smoke against local or remote API (no k6 required).
# Usage: API_BASE=http://localhost:3001 bash scripts/load/smoke.sh

set -euo pipefail
API_BASE="${API_BASE:-http://localhost:3001}"
CATEGORY="${CATEGORY_SLUG:-single-rakhi}"
SESSION="smoke-$(date +%s)"

echo "Smoke load against $API_BASE"
fail=0
check() {
  local name="$1" url="$2"
  code=$(curl -s -o /tmp/hr-smoke.json -w "%{http_code}" -H "X-Session-Id: $SESSION" "$url" || echo "000")
  if [[ "$code" =~ ^2 ]]; then
    echo "OK  $code $name"
  else
    echo "FAIL $code $name"
    fail=1
  fi
}

check health "$API_BASE/health"
check categories "$API_BASE/categories"
check products "$API_BASE/products?category=$CATEGORY"
check products_all "$API_BASE/products"

# parallel burst (50 concurrent GETs)
echo "Burst 50 concurrent category list..."
seq 1 50 | xargs -P 50 -I{} curl -s -o /dev/null -w "%{http_code}\n" \
  -H "X-Session-Id: smoke-{}-$SESSION" \
  "$API_BASE/products?category=$CATEGORY" | sort | uniq -c

if [[ $fail -ne 0 ]]; then
  echo "Smoke failed"
  exit 1
fi
echo "Smoke passed"

#!/usr/bin/env bash
#
# Production smoke test (OP13). Encodes `PHASE5_RUNBOOK.md` §5.5 as runnable
# assertions. Run after every staging deploy and once more against production
# before opening traffic:
#
#   BASE_URL=https://<host> CRON_SECRET=<secret> bash scripts/smoke-prod.sh
#
# Any failed check exits non-zero and blocks go-live.
set -euo pipefail

BASE_URL="${BASE_URL:?BASE_URL is required, e.g. BASE_URL=https://app.example.com}"
CRON_SECRET="${CRON_SECRET:?CRON_SECRET is required (same value as the dashboard)}"

fail=0
check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "PASS  $name (got $actual)"
  else
    echo "FAIL  $name (expected $expected, got $actual)"
    fail=1
  fi
}

code() { curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$@"; }

echo "== health =="
check "GET /api/health -> 200" "200" "$(code "$BASE_URL/api/health")"
check "GET /api/health/ready -> 200" "200" "$(code "$BASE_URL/api/health/ready")"

echo "== crons (auth required) =="
check "cron outbox without secret -> 401" "401" "$(code "$BASE_URL/api/admin/cron/outbox")"
check "cron outbox with secret -> 200" "200" "$(code -H "Authorization: Bearer $CRON_SECRET" "$BASE_URL/api/admin/cron/outbox")"
check "cron inventory with secret -> 200" "200" "$(code -H "Authorization: Bearer $CRON_SECRET" "$BASE_URL/api/admin/cron/inventory")"
check "cron maintenance with secret -> 200" "200" "$(code -H "Authorization: Bearer $CRON_SECRET" "$BASE_URL/api/admin/cron/maintenance")"

echo "== M2M webhooks must NOT be 403 (origin policy) =="
payos="$(code -X POST -H 'content-type: application/json' -d '{}' "$BASE_URL/api/payments/payos/webhook")"
vnpay="$(code -X POST -H 'content-type: application/json' -d '{}' "$BASE_URL/api/payments/vnpay/ipn")"
[[ "$payos" != "403" ]] && echo "PASS  payos webhook not 403 (got $payos)" || { echo "FAIL  payos webhook returned 403"; fail=1; }
[[ "$vnpay" != "403" ]] && echo "PASS  vnpay ipn not 403 (got $vnpay)" || { echo "FAIL  vnpay ipn returned 403"; fail=1; }

echo "== privileged namespaces without auth =="
check "GET /api/admin/users -> 401/403" "401" "$(code "$BASE_URL/api/admin/users")"
check "GET /api/seller/products -> 401/403" "401" "$(code "$BASE_URL/api/seller/products")"

echo "== demo wallet must be disabled in production =="
demo="$(curl -s --max-time 15 -X POST -H 'content-type: application/json' -H 'Idempotency-Key: smoke' -d '{"amount":"100000"}' "$BASE_URL/api/user/balance")"
if echo "$demo" | grep -q "MANUAL_WALLET_MUTATION_DISABLED"; then
  echo "PASS  demo top-up rejected"
else
  echo "FAIL  demo top-up response: $demo"
  fail=1
fi

echo "== robots.txt hides admin =="
robots="$(curl -s --max-time 15 "$BASE_URL/robots.txt")"
if echo "$robots" | grep -q "Disallow: /admin"; then
  echo "PASS  robots.txt disallows /admin"
else
  echo "FAIL  robots.txt missing /admin disallow: $robots"
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then echo "SMOKE FAILED"; exit 1; fi
echo "SMOKE PASSED"

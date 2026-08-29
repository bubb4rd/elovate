#!/usr/bin/env bash
# WZ-03 climb cloud sync smoke — automated checks (run from repo root)
set -euo pipefail

PROD_ORIGIN="${PROD_ORIGIN:-https://elovatesr.netlify.app}"

pass=0
fail=0

run_check() {
  local name="$1"
  shift
  if "$@"; then
    echo "PASS  $name"
    pass=$((pass + 1))
  else
    echo "FAIL  $name"
    fail=$((fail + 1))
  fi
}

http_code() {
  curl -s -o /dev/null -w "%{http_code}" "$@"
}

calc_page_reachable() {
  test "$(http_code "$PROD_ORIGIN/wz/calc")" = "200"
}

flush_exported() {
  rg -q 'export async function flushHistoryPush' src/lib/history/synced-store.ts
}

retry_in_use_history() {
  rg -q 'retrySync' src/lib/history/use-history.ts
}

session_panel_retry_ui() {
  rg -q 'Retry sync' src/components/session-panel.tsx &&
    rg -q 'onRetrySync' src/components/session-panel.tsx
}

sr_calculator_wires_retry() {
  rg -q 'onRetrySync=\{retrySync\}' src/components/sr-calculator.tsx
}

submit_receipt_error_copy() {
  rg -q "Couldn.t submit" src/components/match-submit-receipt.tsx
}

cloud_unit_tests_pass() {
  node --import tsx src/lib/history/cloud.test.ts >/dev/null &&
    node --import tsx src/lib/history/merge.test.ts >/dev/null
}

climb_tables_in_migrations() {
  rg -q 'climb_sessions' supabase/migrations/*.sql &&
    rg -q 'climb_matches' supabase/migrations/*.sql
}

echo "=== WZ-03 climb cloud sync smoke ==="
echo "Prod: $PROD_ORIGIN"
echo

run_check "/wz/calc reachable on prod" calc_page_reachable
run_check "flushHistoryPush exported" flush_exported
run_check "useHistory exposes retrySync" retry_in_use_history
run_check "SessionPanel retry sync UI" session_panel_retry_ui
run_check "SrCalculator wires onRetrySync" sr_calculator_wires_retry
run_check "MatchSubmitReceipt error state" submit_receipt_error_copy
run_check "cloud + merge unit tests" cloud_unit_tests_pass
run_check "climb_sessions/climb_matches migrations" climb_tables_in_migrations

echo
echo "=== summary: $pass passed, $fail failed ==="
echo "Manual: sign in on /wz/calc, log a match, confirm session panel updates; block network or revoke session to verify sync banner + Retry sync."
test "$fail" -eq 0

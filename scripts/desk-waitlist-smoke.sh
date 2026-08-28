#!/usr/bin/env bash
# DESK workstream smoke — automated checks (run from repo root)
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

desktop_page_loads() {
  test "$(http_code "$PROD_ORIGIN/desktop")" = "200"
}

home_teaser_links_desktop() {
  local html
  html=$(curl -sf "$PROD_ORIGIN/")
  printf '%s' "$html" | rg -q 'href="/desktop"'
}

footer_links_desktop() {
  rg -q 'href="/desktop"' src/components/site-footer.tsx
}

waitlist_migration_exists() {
  test -f supabase/migrations/20260827213830_create_desktop_waitlist.sql
}

waitlist_rls_test_exists() {
  test -f supabase/tests/desktop_waitlist_rls.test.sql
}

export_script_exists() {
  test -f supabase/scripts/export_desktop_waitlist.sql
}

waitlist_dedupe_in_migration() {
  rg -q 'desktop_waitlist_email_unique' supabase/migrations/20260827213830_create_desktop_waitlist.sql
}

waitlist_confirmation_copy() {
  rg -q "on the list" src/components/desktop/desktop-waitlist-form.tsx
}

waitlist_client_module() {
  test -f src/lib/desktop/waitlist.ts
}

email_validation_tests_pass() {
  node --import tsx src/lib/desktop/email.test.ts >/dev/null
}

echo "=== DESK waitlist smoke ==="
echo "Prod: $PROD_ORIGIN"
echo

run_check "DESK-01 /desktop loads on prod" desktop_page_loads
run_check "DESK-02 home teaser links /desktop" home_teaser_links_desktop
run_check "DESK-07 footer links /desktop" footer_links_desktop
run_check "DESK-04 waitlist migration exists" waitlist_migration_exists
run_check "DESK-04 waitlist RLS test exists" waitlist_rls_test_exists
run_check "DESK-05 email dedupe index in migration" waitlist_dedupe_in_migration
run_check "DESK-05 confirmation UX copy present" waitlist_confirmation_copy
run_check "DESK-03 waitlist client module" waitlist_client_module
run_check "DESK-06 ops export script exists" export_script_exists
run_check "waitlist email unit tests pass" email_validation_tests_pass

echo
echo "=== summary: $pass passed, $fail failed ==="
echo "Manual: submit waitlist form on /desktop (logged out + logged in)."
test "$fail" -eq 0

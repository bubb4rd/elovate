#!/usr/bin/env bash
# WZ-02 onboarding edge-case smoke — automated checks (run from repo root)
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

redirect_location() {
  curl -sI "$1" | tr -d '\r' | awk 'tolower($1) == "location:" { print $2; exit }'
}

onboarding_redirects_to_login() {
  local location
  location=$(redirect_location "$PROD_ORIGIN/onboarding")
  printf '%s' "$location" | rg -qi '/login'
}

onboarding_honors_next_param() {
  local location
  location=$(redirect_location "$PROD_ORIGIN/onboarding?next=%2Fwz%2Fcalc")
  printf '%s' "$location" | rg -qi 'next=.*%2Fwz%2Fcalc|next=.*%252Fwz%252Fcalc'
}

settings_redirects_unauthenticated() {
  local location
  location=$(redirect_location "$PROD_ORIGIN/settings")
  printf '%s' "$location" | rg -qi '/login'
}

onboarding_page_reachable_after_login_gate() {
  test "$(http_code "$PROD_ORIGIN/login?next=%2Fonboarding")" = "200"
}

insert_policy_in_migrations() {
  rg -q 'Owners can insert their profile' supabase/migrations/*.sql
}

current_sr_insert_grant_present() {
  rg -q 'current_sr' supabase/migrations/20260827014500_add_profile_current_sr.sql
}

auth_paths_unit_tests_pass() {
  node --import tsx src/lib/auth/paths.test.ts >/dev/null
}

echo "=== WZ-02 onboarding smoke ==="
echo "Prod: $PROD_ORIGIN"
echo

run_check "unauthenticated /onboarding -> /login" onboarding_redirects_to_login
run_check "onboarding preserves next=/wz/calc in login redirect" onboarding_honors_next_param
run_check "unauthenticated /settings -> /login" settings_redirects_unauthenticated
run_check "login?next=/onboarding reachable" onboarding_page_reachable_after_login_gate
run_check "profiles insert RLS policy in migrations" insert_policy_in_migrations
run_check "current_sr included in onboarding insert grant" current_sr_insert_grant_present
run_check "auth path unit tests (incomplete -> onboarding)" auth_paths_unit_tests_pass

echo
echo "=== summary: $pass passed, $fail failed ==="
echo "Manual: sign in as auth user with no profiles row, complete /onboarding wizard, confirm /players/[slug] loads."
test "$fail" -eq 0

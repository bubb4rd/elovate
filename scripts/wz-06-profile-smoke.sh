#!/usr/bin/env bash
# WZ-06 profile privacy / themes / reputation smoke — automated checks (run from repo root)
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

is_private_column_in_migrations() {
  rg -q 'is_private' supabase/migrations/20260827020000_add_profile_settings.sql
}

profile_page_privacy_gate() {
  rg -q 'profile.isPrivate && profile.id !== viewer' src/app/players/\[slug\]/page.tsx
}

metadata_privacy_gate() {
  rg -q 'Private profile' src/app/players/\[slug\]/page.tsx
}

reputation_rpc_in_migrations() {
  rg -q 'cast_profile_vote' supabase/migrations/20260827025123_add_profile_votes.sql
}

profile_votes_test_exists() {
  test -f supabase/tests/profile_votes_rls.test.sql
}

themes_persist_in_save() {
  rg -q 'page_theme_id' src/lib/profile/save.ts
}

headers_soft_unlock_tests_pass() {
  node --import tsx src/lib/profile/headers.test.ts >/dev/null
  node --import tsx src/lib/profile/themes.test.ts >/dev/null
}

search_excludes_private_profiles() {
  rg -q 'is_private.*false' src/lib/profile/search.ts
}

settings_privacy_toggle() {
  rg -q 'isPrivate' src/components/settings/privacy-settings.tsx
}

wz06_docs_present() {
  test -f docs/WZ-06-profile-smoke-results.md
}

settings_requires_auth() {
  local location
  # /settings now 307s to /settings/account before the auth gate fires, so
  # follow the whole redirect chain and match the final hop.
  location=$(curl -sIL "$PROD_ORIGIN/settings" | tr -d '\r' | awk 'tolower($1) == "location:" { print $2 }' | tail -1)
  printf '%s' "$location" | rg -qi '/login'
}

echo "=== WZ-06 profile smoke ==="
echo "Prod: $PROD_ORIGIN"
echo

run_check "WZ-06 results doc exists" wz06_docs_present
run_check "is_private column in migrations" is_private_column_in_migrations
run_check "player page privacy gate" profile_page_privacy_gate
run_check "metadata hides private profile names" metadata_privacy_gate
run_check "cast_profile_vote RPC in migrations" reputation_rpc_in_migrations
run_check "profile_votes pgTAP test exists" profile_votes_test_exists
run_check "themes persist via page_theme_id" themes_persist_in_save
run_check "header + theme unit tests pass" headers_soft_unlock_tests_pass
run_check "teammate search excludes private profiles" search_excludes_private_profiles
run_check "settings privacy toggle present" settings_privacy_toggle
run_check "unauthenticated /settings -> /login" settings_requires_auth

echo
echo "=== summary: $pass passed, $fail failed ==="
echo "Manual: private profile 404 for anon; reputation vote day-lock in browser."
test "$fail" -eq 0

#!/usr/bin/env bash
# WZ-01 production auth smoke — automated checks (run from repo root)
set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-https://ioagctykwkspbwzyrfcb.supabase.co}"
PROD_ORIGIN="${PROD_ORIGIN:-https://elovatesr.netlify.app}"
ANON_KEY="${ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvYWdjdHlrd2tzcGJ3enlyZmNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2OTY2MjYsImV4cCI6MjEwMzI3MjYyNn0.8c5j4aP9q99OUIJqRmrPgPqVsKGpdNCJ-JERNZeRJUE}"

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

redirect_allowed() {
  local url="$1"
  local encoded
  encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$url'))")
  test "$(http_code "${SUPABASE_URL}/auth/v1/authorize?provider=discord&redirect_to=${encoded}")" = "302"
}

login_page_configured() {
  local html
  html=$(curl -sf "$PROD_ORIGIN/login")
  printf '%s' "$html" | rg -q "Continue with Discord"
}

auth_complete_reachable() {
  test "$(http_code "$PROD_ORIGIN/auth/complete?next=%2F")" = "200"
}

invalid_callback_rejected() {
  # Curl has no PKCE verifier, so exchange fails with a code-verifier message and
  # the app redirects to error=device. Other auth failures use error=auth.
  local headers
  headers=$(curl -sI "$PROD_ORIGIN/auth/callback?code=invalid-wz01")
  printf '%s' "$headers" | rg -qi "location:.*login\\?error=(auth|device)"
}

discord_oauth_ok() {
  local encoded redirect
  encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$PROD_ORIGIN/auth/callback'))")
  redirect=$(curl -s -o /dev/null -w "%{redirect_url}" \
    "${SUPABASE_URL}/auth/v1/authorize?provider=discord&redirect_to=${encoded}")
  printf '%s' "$redirect" | rg -q "redirect_uri=https%3A%2F%2Fioagctykwkspbwzyrfcb.supabase.co%2Fauth%2Fv1%2Fcallback"
  printf '%s' "$redirect" | rg -q "redirect_to=https%3A%2F%2Felovatesr.netlify.app%2Fauth%2Fcallback"
}

magic_link_otp_ok() {
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${SUPABASE_URL}/auth/v1/otp" \
    -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"wz01-smoke@mailinator.com\",\"options\":{\"email_redirect_to\":\"$PROD_ORIGIN/auth/callback\"}}")
  # 200 = sent; 429 = rate-limited but endpoint + redirect URL accepted
  test "$code" = "200" -o "$code" = "429"
}

echo "=== WZ-01 auth smoke ==="
echo "Supabase: $SUPABASE_URL"
echo "Prod:     $PROD_ORIGIN"
echo

run_check "production login page configured" login_page_configured
run_check "production /auth/complete reachable" auth_complete_reachable
run_check "invalid callback code -> login?error=auth|device" invalid_callback_rejected
run_check "prod /auth/callback redirect allowlisted" redirect_allowed "$PROD_ORIGIN/auth/callback"
run_check "prod bare origin redirect allowlisted" redirect_allowed "$PROD_ORIGIN"
run_check "local 127.0.0.1 callback allowlisted" redirect_allowed "http://127.0.0.1:3000/auth/callback"
run_check "local localhost callback allowlisted" redirect_allowed "http://localhost:3000/auth/callback"
run_check "discord oauth redirect chain" discord_oauth_ok
run_check "magic link OTP accepts prod callback" magic_link_otp_ok

echo
echo "=== summary: $pass passed, $fail failed ==="
test "$fail" -eq 0

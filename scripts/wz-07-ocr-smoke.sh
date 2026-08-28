#!/usr/bin/env bash
# WZ-07 OCR optional smoke — automated checks (run from repo root)
set -euo pipefail

PROD_ORIGIN="${PROD_ORIGIN:-https://elovatesr.netlify.app}"
LOCAL_ORIGIN="${LOCAL_ORIGIN:-http://127.0.0.1:3000}"

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

ocr_docs_present() {
  test -f docs/WZ-07-ocr-optional.md
}

env_example_has_ocr_vars() {
  rg -q 'GOOGLE_CLOUD_CREDENTIALS' .env.example
}

ocr_route_soft_fails() {
  local origin="${1:-$PROD_ORIGIN}"
  local code
  code=$(http_code -X POST "${origin}/api/ocr/sr-breakdown")
  # 503 = Vision off; 400 = Vision on but no image — both are recoverable soft paths
  test "$code" = "503" -o "$code" = "400"
}

ocr_route_returns_json_error() {
  local origin="${1:-$PROD_ORIGIN}"
  local body
  body=$(curl -s -X POST "${origin}/api/ocr/sr-breakdown")
  printf '%s' "$body" | rg -q '"error"'
}

readme_documents_optional_ocr() {
  rg -q 'SR screenshot OCR' README.md && rg -q 'WZ-07-ocr-optional' README.md
}

ocr_route_checks_credentials_first() {
  rg -q 'visionCredentialsConfigured' src/app/api/ocr/sr-breakdown/route.ts
}

calc_page_loads() {
  local origin="${1:-$PROD_ORIGIN}"
  test "$(http_code "${origin}/wz/calc")" = "200"
}

vision_unit_tests_pass() {
  node --import tsx src/lib/ocr/vision-client.test.ts >/dev/null
  node --import tsx src/lib/ocr/parse-sr-breakdown.test.ts >/dev/null
  node --import tsx src/lib/ocr/error-matrix.test.ts >/dev/null
}

echo "=== WZ-07 OCR optional smoke ==="
echo "Prod: $PROD_ORIGIN"
echo

run_check "WZ-07 ops doc exists" ocr_docs_present
run_check ".env.example documents OCR vars" env_example_has_ocr_vars
run_check "README documents optional OCR" readme_documents_optional_ocr
run_check "vision + parse unit tests pass" vision_unit_tests_pass
run_check "OCR route checks credentials before parse" ocr_route_checks_credentials_first
run_check "prod /wz/calc loads" calc_page_loads "$PROD_ORIGIN"
run_check "prod OCR route returns recoverable error" ocr_route_soft_fails "$PROD_ORIGIN"
run_check "prod OCR error is JSON (user-visible)" ocr_route_returns_json_error "$PROD_ORIGIN"

echo
echo "=== summary: $pass passed, $fail failed ==="
test "$fail" -eq 0

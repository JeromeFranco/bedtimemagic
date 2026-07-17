#!/usr/bin/env bash
# test-single.sh — Test a single Supabase Edge Function
#
# Usage: ./test-single.sh <SUPABASE_URL> <PUBLISHABLE_KEY> <FUNCTION_NAME> [REQUEST_BODY]
#
# Functions: generate-story, generate-cover-image, generate-story-audio
#
# Examples:
#   ./test-single.sh https://xxx.supabase.co sb_publishable_xxx generate-story '{"childId":"...","protagonistId":"barnaby",...}'
#   ./test-single.sh https://xxx.supabase.co sb_publishable_xxx generate-cover-image '{"storyId":"...","title":"..."}'
#   ./test-single.sh https://xxx.supabase.co sb_publishable_xxx generate-story-audio '{"story_text":"..."}'

set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────────

SUPABASE_URL="${1:?Usage: $0 <SUPABASE_URL> <PUBLISHABLE_KEY> <FUNCTION_NAME> [REQUEST_BODY]}"
PUBLISHABLE_KEY="${2:?Usage: $0 <SUPABASE_URL> <PUBLISHABLE_KEY> <FUNCTION_NAME> [REQUEST_BODY]}"
FUNCTION_NAME="${3:?Usage: $0 <SUPABASE_URL> <PUBLISHABLE_KEY> <FUNCTION_NAME> [REQUEST_BODY]}"
REQUEST_BODY="${4:-{}}"

# ─── Helpers ────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[TEST]${NC} $*"; }
ok() { echo -e "${GREEN}[OK]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }

now_ms() { date +%s%N | awk '{print int($1/1000000)}'; }

# ─── Validate Function Name ────────────────────────────────────────────────────

VALID_FUNCTIONS=("generate-story" "generate-cover-image" "generate-story-audio")
if [[ ! " ${VALID_FUNCTIONS[*]} " =~ " ${FUNCTION_NAME} " ]]; then
  fail "Invalid function: $FUNCTION_NAME. Valid: ${VALID_FUNCTIONS[*]}"
fi

# ─── Authenticate ───────────────────────────────────────────────────────────────

log "Authenticating..."

AUTH_RESPONSE=$(curl -sf -X POST "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"data":{}}') || fail "Auth failed"

ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.access_token // empty')
[[ -n "$ACCESS_TOKEN" ]] || fail "No access token"

ok "Authenticated"

# ─── Call Function ──────────────────────────────────────────────────────────────

log "Calling $FUNCTION_NAME..."

START=$(now_ms)
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SUPABASE_URL/functions/v1/$FUNCTION_NAME" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_BODY")
END=$(now_ms)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
CLOCK_MS=$((END - START))
BODY_SIZE=${#BODY}

# ─── Check Result ───────────────────────────────────────────────────────────────

if [[ "$HTTP_CODE" -ge 400 ]]; then
  echo -e "${RED}[ERROR]${NC} HTTP $HTTP_CODE"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
  exit 1
fi

ok "HTTP $HTTP_CODE (${CLOCK_MS}ms, ${BODY_SIZE} bytes)"

# ─── Output ─────────────────────────────────────────────────────────────────────

echo ""
echo "Response:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""
echo "Metrics:"
echo "  HTTP Status:    $HTTP_CODE"
echo "  Clock Time:     ${CLOCK_MS}ms"
echo "  Response Size:  ${BODY_SIZE} bytes"
echo ""

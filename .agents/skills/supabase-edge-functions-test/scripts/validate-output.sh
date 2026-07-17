#!/usr/bin/env bash
# validate-output.sh — Validate that all expected output files exist and are valid
#
# Usage: ./validate-output.sh [OUTPUT_DIR]
#
# Checks:
#   - All expected files exist
#   - JSON files are valid JSON
#   - PNG file is a valid image
#   - MP3 file has content

set -euo pipefail

OUTPUT_DIR="${1:-output}"

# ─── Helpers ────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check_pass() { echo -e "  ${GREEN}✓${NC} $1"; PASS=$((PASS + 1)); }
check_fail() { echo -e "  ${RED}✗${NC} $1"; FAIL=$((FAIL + 1)); }
check_warn() { echo -e "  ${YELLOW}⚠${NC} $1"; WARN=$((WARN + 1)); }

# ─── Validate ───────────────────────────────────────────────────────────────────

echo "Validating output directory: $OUTPUT_DIR"
echo ""

# Check directory exists
if [[ ! -d "$OUTPUT_DIR" ]]; then
  echo -e "${RED}Directory not found: $OUTPUT_DIR${NC}"
  exit 1
fi

# Required files
EXPECTED_FILES=(
  "00-auth.json"
  "00-prompts.md"
  "00-summary-metrics.json"
  "01-child-profile.json"
  "02-generate-story-request.json"
  "02-generate-story-response.json"
  "02-generate-story-metrics.json"
  "03-generate-cover-image-request.json"
  "03-generate-cover-image-response.json"
  "03-cover-image.png"
  "03-generate-cover-image-metrics.json"
  "04-generate-story-audio-request.json"
  "04-generate-story-audio-response.json"
  "04-story-audio.mp3"
  "04-generate-story-audio-metrics.json"
)

echo "Checking required files..."
for file in "${EXPECTED_FILES[@]}"; do
  filepath="$OUTPUT_DIR/$file"
  if [[ ! -f "$filepath" ]]; then
    check_fail "Missing: $file"
    continue
  fi

  # Validate JSON files
  if [[ "$file" == *.json ]]; then
    if jq empty "$filepath" 2>/dev/null; then
      check_pass "$file (valid JSON)"
    else
      check_fail "$file (invalid JSON)"
    fi
  # Validate PNG
  elif [[ "$file" == *.png ]]; then
    size=$(stat -c%s "$filepath" 2>/dev/null || stat -f%z "$filepath" 2>/dev/null || echo 0)
    if [[ "$size" -gt 1000 ]]; then
      check_pass "$file ($size bytes)"
    else
      check_warn "$file ($size bytes - may be too small)"
    fi
  # Validate MP3
  elif [[ "$file" == *.mp3 ]]; then
    size=$(stat -c%s "$filepath" 2>/dev/null || stat -f%z "$filepath" 2>/dev/null || echo 0)
    if [[ "$size" -gt 10000 ]]; then
      check_pass "$file ($size bytes)"
    else
      check_warn "$file ($size bytes - may be too small)"
    fi
  # Markdown
  elif [[ "$file" == *.md ]]; then
    check_pass "$file"
  else
    check_pass "$file"
  fi
done

echo ""

# Check summary metrics for required fields
SUMMARY="$OUTPUT_DIR/00-summary-metrics.json"
if [[ -f "$SUMMARY" ]]; then
  echo "Checking summary metrics..."
  
  for field in test_run supabase_url user_id totals.total_clock_time_ms; do
    value=$(jq -r ".$field // empty" "$SUMMARY" 2>/dev/null)
    if [[ -n "$value" ]]; then
      check_pass "Field: $field"
    else
      check_fail "Missing field: $field"
    fi
  done
  
  # Check function timings
  for fn in generate-story generate-cover-image generate-story-audio; do
    ms=$(jq -r ".functions.\"$fn\".clock_time_ms // empty" "$SUMMARY" 2>/dev/null)
    if [[ -n "$ms" ]]; then
      check_pass "Timing: $fn ($ms ms)"
    else
      check_warn "No timing for: $fn"
    fi
  done
  
  echo ""
fi

# ─── Summary ────────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "  Validation Summary"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  ${GREEN}Passed: $PASS${NC}"
echo "  ${YELLOW}Warnings: $WARN${NC}"
echo "  ${RED}Failed: $FAIL${NC}"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
  echo -e "${RED}Validation FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}Validation PASSED${NC}"
  exit 0
fi

#!/usr/bin/env bash
# test-pipeline.sh — Full pipeline test for Supabase Edge Functions
# Tests: generate-story → generate-cover-image → generate-story-audio
#
# Usage: ./test-pipeline.sh <SUPABASE_URL> <PUBLISHABLE_KEY> [OUTPUT_DIR]
#
# Example:
#   ./test-pipeline.sh https://xxxxx.supabase.co sb_publishable_xxxxx output/

set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────────

SUPABASE_URL="${1:?Usage: $0 <SUPABASE_URL> <PUBLISHABLE_KEY> [OUTPUT_DIR]}"
PUBLISHABLE_KEY="${2:?Usage: $0 <SUPABASE_URL> <PUBLISHABLE_KEY> [OUTPUT_DIR]}"
OUTPUT_DIR="${3:-output}"

# Test data (customizable via env vars)
PROTAGONIST="${PROTAGONIST:-barnaby}"
CHILD_NICKNAME="${CHILD_NICKNAME:-Emma}"
DEVELOPMENTAL_STAGE="${DEVELOPMENTAL_STAGE:-preschool}"
TIER1_CHALLENGE="${TIER1_CHALLENGE:-bedtime}"
TIER2_TRIGGER="${TIER2_TRIGGER:-leaving_bedroom}"

# ─── Helpers ────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[TEST]${NC} $*"; }
ok() { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }

timestamp() { date -u +%Y-%m-%dT%H:%M:%SZ; }
now_ms() { date +%s%N | awk '{print int($1/1000000)}'; }

# ─── Setup ──────────────────────────────────────────────────────────────────────

mkdir -p "$OUTPUT_DIR"
START_OVERALL=$(now_ms)

log "Testing: $SUPABASE_URL"
log "Output:  $OUTPUT_DIR"
echo ""

# ─── Step 0: Authenticate ──────────────────────────────────────────────────────

log "Step 0: Authenticating anonymously..."

AUTH_RESPONSE=$(curl -sf -X POST "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"data":{}}') || fail "Auth request failed"

ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.access_token // empty')
USER_ID=$(echo "$AUTH_RESPONSE" | jq -r '.user.id // empty')

[[ -n "$ACCESS_TOKEN" ]] || fail "No access token in response"
[[ -n "$USER_ID" ]] || fail "No user ID in response"

ok "Authenticated as: $USER_ID"

cat > "$OUTPUT_DIR/00-auth.json" << EOF
{
  "user_id": "$USER_ID",
  "authenticated_at": "$(timestamp)",
  "supabase_url": "$SUPABASE_URL"
}
EOF

# ─── Step 1: Create Test Child Profile ─────────────────────────────────────────

log "Step 1: Creating test child profile..."

CHILD_RESPONSE=$(curl -sf -X POST "$SUPABASE_URL/rest/v1/children" \
  -H "apikey: $PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"name\": \"$CHILD_NICKNAME\",
    \"developmental_stage\": \"$DEVELOPMENTAL_STAGE\",
    \"protagonist\": \"$PROTAGONIST\"
  }") || fail "Failed to create child profile"

CHILD_ID=$(echo "$CHILD_RESPONSE" | jq -r '.[0].id // .id // empty')
[[ -n "$CHILD_ID" ]] || fail "No child ID in response"

ok "Created child: $CHILD_ID"
echo "$CHILD_RESPONSE" | jq . > "$OUTPUT_DIR/01-child-profile.json"

# ─── Step 2: Generate Story ────────────────────────────────────────────────────

log "Step 2: Generating story..."

STORY_REQUEST=$(cat << EOF
{
  "childId": "$CHILD_ID",
  "protagonistId": "$PROTAGONIST",
  "childNickname": "$CHILD_NICKNAME",
  "developmentalStage": "$DEVELOPMENTAL_STAGE",
  "tier1Challenge": "$TIER1_CHALLENGE",
  "tier2Trigger": "$TIER2_TRIGGER"
}
EOF
)

echo "$STORY_REQUEST" | jq . > "$OUTPUT_DIR/02-generate-story-request.json"

START=$(now_ms)
STORY_RESPONSE=$(curl -sf -X POST "$SUPABASE_URL/functions/v1/generate-story" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$STORY_REQUEST") || fail "generate-story failed"
END=$(now_ms)

STORY_MS=$((END - START))
STORY_SIZE=${#STORY_RESPONSE}

STORY_ID=$(echo "$STORY_RESPONSE" | jq -r '.id // empty')
STORY_TITLE=$(echo "$STORY_RESPONSE" | jq -r '.title // empty')
STORY_TEXT=$(echo "$STORY_RESPONSE" | jq -r '.story_text // empty')

[[ -n "$STORY_ID" ]] || fail "No story ID in response"

echo "$STORY_RESPONSE" | jq . > "$OUTPUT_DIR/02-generate-story-response.json"

WORD_COUNT=$(echo "$STORY_TEXT" | wc -w | tr -d ' ')

cat > "$OUTPUT_DIR/02-generate-story-metrics.json" << EOF
{
  "function": "generate-story",
  "clock_time_ms": $STORY_MS,
  "response_size_bytes": $STORY_SIZE,
  "story_id": "$STORY_ID",
  "story_title": "$STORY_TITLE",
  "story_word_count": $WORD_COUNT
}
EOF

ok "Story: '$STORY_TITLE' ($WORD_COUNT words, ${STORY_MS}ms)"

# ─── Step 3: Generate Cover Image ──────────────────────────────────────────────

log "Step 3: Generating cover image..."

COVER_REQUEST=$(cat << EOF
{
  "storyId": "$STORY_ID",
  "title": "$STORY_TITLE"
}
EOF
)

echo "$COVER_REQUEST" | jq . > "$OUTPUT_DIR/03-generate-cover-image-request.json"

START=$(now_ms)
COVER_RESPONSE=$(curl -sf -X POST "$SUPABASE_URL/functions/v1/generate-cover-image" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$COVER_REQUEST") || fail "generate-cover-image failed"
END=$(now_ms)

COVER_MS=$((END - START))
COVER_SIZE=${#COVER_RESPONSE}

COVER_URL=$(echo "$COVER_RESPONSE" | jq -r '.coverImageUrl // empty')

echo "$COVER_RESPONSE" | jq . > "$OUTPUT_DIR/03-generate-cover-image-response.json"

IMAGE_SIZE=0
if [[ -n "$COVER_URL" ]]; then
  curl -sf "$COVER_URL" -o "$OUTPUT_DIR/03-cover-image.png" || warn "Failed to download image"
  IMAGE_SIZE=$(stat -c%s "$OUTPUT_DIR/03-cover-image.png" 2>/dev/null || stat -f%z "$OUTPUT_DIR/03-cover-image.png" 2>/dev/null || echo 0)
fi

cat > "$OUTPUT_DIR/03-generate-cover-image-metrics.json" << EOF
{
  "function": "generate-cover-image",
  "clock_time_ms": $COVER_MS,
  "response_size_bytes": $COVER_SIZE,
  "cover_url": "$COVER_URL",
  "image_file_size_bytes": $IMAGE_SIZE
}
EOF

ok "Cover image: ${IMAGE_SIZE} bytes (${COVER_MS}ms)"

# ─── Step 4: Generate Story Audio ──────────────────────────────────────────────

log "Step 4: Generating story audio..."

AUDIO_REQUEST=$(cat << EOF
{
  "story_text": $(echo "$STORY_TEXT" | jq -Rs .)
}
EOF
)

# Save request without full story text for readability
echo "$AUDIO_REQUEST" | jq '{story_text: (.story_text | length | tostring + " chars")}' > "$OUTPUT_DIR/04-generate-story-audio-request.json"

START=$(now_ms)
AUDIO_RESPONSE=$(curl -sf -X POST "$SUPABASE_URL/functions/v1/generate-story-audio" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$AUDIO_REQUEST") || fail "generate-story-audio failed"
END=$(now_ms)

AUDIO_MS=$((END - START))
AUDIO_SIZE=${#AUDIO_RESPONSE}

AUDIO_BASE64=$(echo "$AUDIO_RESPONSE" | jq -r '.audio // empty')

# Save response without audio data
echo "$AUDIO_RESPONSE" | jq '{has_audio: (.audio != null), audio_length: (.audio | length)}' > "$OUTPUT_DIR/04-generate-story-audio-response.json"

AUDIO_FILE_SIZE=0
DURATION_SEC=0
if [[ -n "$AUDIO_BASE64" ]]; then
  echo "$AUDIO_BASE64" | base64 -d > "$OUTPUT_DIR/04-story-audio.mp3"
  AUDIO_FILE_SIZE=$(stat -c%s "$OUTPUT_DIR/04-story-audio.mp3" 2>/dev/null || stat -f%z "$OUTPUT_DIR/04-story-audio.mp3" 2>/dev/null || echo 0)
  # Estimate: MP3 at 128kbps = 16KB/s
  DURATION_SEC=$(echo "scale=1; $AUDIO_FILE_SIZE / 16000" | bc 2>/dev/null || echo 0)
fi

cat > "$OUTPUT_DIR/04-generate-story-audio-metrics.json" << EOF
{
  "function": "generate-story-audio",
  "clock_time_ms": $AUDIO_MS,
  "response_size_bytes": $AUDIO_SIZE,
  "audio_file_size_bytes": $AUDIO_FILE_SIZE,
  "estimated_duration_seconds": $DURATION_SEC
}
EOF

ok "Audio: ${AUDIO_FILE_SIZE} bytes, ~${DURATION_SEC}s (${AUDIO_MS}ms)"

# ─── Step 5: Save Prompts ──────────────────────────────────────────────────────

log "Step 5: Saving prompts..."

cat > "$OUTPUT_DIR/00-prompts.md" << 'PROMPTS_EOF'
# Prompts Used in generate-story

## System Prompt

```
You are a children's bedtime story author. You write calming, sleep-appropriate stories that help children aged 4-10 process behavioral challenges through gentle narrative.

RULES:
- Stories must be 1200-1500 words (approximately 10 minutes when read aloud)
- Tone: warm, soothing, low-arousal — nothing scary, exciting, or stimulating
- The protagonist must be integrated naturally as the main character
- The moral must directly address the behavioral challenge
- No PII: never use real names, locations, or identifying details
- Vocabulary must match the child's developmental stage
- End with the child character feeling calm, safe, and ready for sleep

STORY STRUCTURE (4-beat arc):
1. SETUP (10-15%): Introduce protagonist in cozy setting. Show child before challenge.
2. CHALLENGE (30-40%): Challenge emerges naturally. Protagonist models emotional experience.
3. RESOLUTION (40-50%): Protagonist demonstrates coping through metaphor. Child learns by observing.
4. LANDING (10-15%): Gentle wind-down. End with warmth, safety, readiness for sleep.

TEACHING APPROACH:
- Protagonist MODELS behavior, never lectures
- Coping skills as gentle metaphors (breathing, patience, gentle hands, sharing)
- Child learns by OBSERVING protagonist
- Child mirrors emotion → observes coping → feels resolution

OUTPUT FORMAT:
Return ONLY valid JSON with: title, storyText, moral, pillowTalkPrompt, sleepyAffirmation
```

## User Prompt (test example)

```
Write a bedtime story for a child nicknamed "Emma".

PROTAGONIST: Barnaby the Bear
Personality: Gentle, patient bear who loves warm hugs and honey.

CHILD'S DEVELOPMENTAL STAGE: Preschool (ages 4-5)
Vocabulary: Concrete, familiar objects. Simple, warm words.
Sentences: 5-8 words. Repetition welcome.

TONIGHT'S CHALLENGE:
Category: Bedtime Friction
Specific situation: Leaving the bedroom

Write a story where Barnaby helps Emma understand and cope with this challenge.
```
PROMPTS_EOF

ok "Prompts saved"

# ─── Step 6: Summary Metrics ───────────────────────────────────────────────────

log "Step 6: Generating summary metrics..."

END_OVERALL=$(now_ms)
TOTAL_MS=$((END_OVERALL - START_OVERALL))

cat > "$OUTPUT_DIR/00-summary-metrics.json" << EOF
{
  "test_run": "$(timestamp)",
  "supabase_url": "$SUPABASE_URL",
  "user_id": "$USER_ID",
  "child_id": "$CHILD_ID",
  "test_data": {
    "protagonist": "$PROTAGONIST",
    "child_nickname": "$CHILD_NICKNAME",
    "developmental_stage": "$DEVELOPMENTAL_STAGE",
    "tier1_challenge": "$TIER1_CHALLENGE",
    "tier2_trigger": "$TIER2_TRIGGER"
  },
  "functions": {
    "generate-story": {
      "clock_time_ms": $STORY_MS,
      "response_size_bytes": $STORY_SIZE,
      "story_word_count": $WORD_COUNT
    },
    "generate-cover-image": {
      "clock_time_ms": $COVER_MS,
      "response_size_bytes": $COVER_SIZE,
      "image_file_size_bytes": $IMAGE_SIZE
    },
    "generate-story-audio": {
      "clock_time_ms": $AUDIO_MS,
      "response_size_bytes": $AUDIO_SIZE,
      "audio_file_size_bytes": $AUDIO_FILE_SIZE,
      "estimated_duration_seconds": $DURATION_SEC
    }
  },
  "totals": {
    "total_clock_time_ms": $TOTAL_MS,
    "total_clock_time_seconds": $(echo "scale=2; $TOTAL_MS / 1000" | bc)
  }
}
EOF

ok "Summary saved"

# ─── Final Report ───────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TEST COMPLETE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Story:      $STORY_TITLE"
echo "  Words:      $WORD_COUNT"
echo "  Cover:      ${IMAGE_SIZE} bytes"
echo "  Audio:      ~${DURATION_SEC}s (${AUDIO_FILE_SIZE} bytes)"
echo ""
echo "  Timings:"
echo "    Story:        ${STORY_MS}ms"
echo "    Cover Image:  ${COVER_MS}ms"
echo "    Audio:        ${AUDIO_MS}ms"
echo "    ─────────────────────"
echo "    Total:        ${TOTAL_MS}ms ($(echo "scale=2; $TOTAL_MS / 1000" | bc)s)"
echo ""
echo -e "  Output: ${GREEN}$OUTPUT_DIR/${NC}"
echo ""
ls -1 "$OUTPUT_DIR" | sed 's/^/    /'
echo ""

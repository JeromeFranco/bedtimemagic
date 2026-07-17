# Plan: Test Live Supabase Edge Functions

## Overview

Test the three Supabase Edge Functions (`generate-story`, `generate-cover-image`, `generate-story-audio`) via curl, matching the sequence called by `generate.tsx`. Save all artifacts and metrics to `output/`.

## Prerequisites

- **Supabase URL**: `https://bbmrjtlaqhvjtkxrbnqj.supabase.co` (hosted)
- **Supabase Publishable Key**: `sb_publishable_tKaS2KEAKmQwWu7FFR396Q_fU3D8Z1a`
- All three functions require authentication via `withSupabase({ auth: "user" })`

## Execution Sequence

### Step 0: Authenticate (Anonymous Sign-In)

The app uses anonymous auth. We'll sign in anonymously to get a JWT token for subsequent requests.

```bash
curl -X POST "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"data":{}}'
```

Save token for reuse.

### Step 1: Generate Story

**Function**: `generate-story`  
**Input** (matching `generateStory()` params):
```json
{
  "childId": "<from DB or dummy>",
  "protagonistId": "barnaby",
  "childNickname": "Emma",
  "developmentalStage": "preschool",
  "tier1Challenge": "bedtime",
  "tier2Trigger": "leaving_bedroom"
}
```

**Expected Output**: Story object with `id`, `title`, `story_text`, `moral`, `pillow_talk_prompt`, `sleepy_affirmation`

**Metrics**: 
- Clock time (curl `--write-out '%{time_total}'`)
- Response body size
- LLM token usage (if returned)

**Artifacts**:
- `output/01-generate-story-request.json`
- `output/01-generate-story-response.json`
- `output/01-generate-story-metrics.json`

### Step 2: Generate Cover Image

**Function**: `generate-cover-image`  
**Input** (using story ID from Step 1):
```json
{
  "storyId": "<story.id from step 1>",
  "title": "<story.title from step 1>"
}
```

**Expected Output**: `{ "coverImageUrl": "..." }`

**Metrics**:
- Clock time
- Response body size
- Downloaded image file size

**Artifacts**:
- `output/02-generate-cover-image-request.json`
- `output/02-generate-cover-image-response.json`
- `output/02-cover-image.png` (downloaded)
- `output/02-generate-cover-image-metrics.json`

### Step 3: Generate Story Audio

**Function**: `generate-story-audio`  
**Input** (using story text from Step 1):
```json
{
  "story_text": "<story.story_text from step 1>"
}
```

**Expected Output**: `{ "audio": "<base64 MP3>" }`

**Metrics**:
- Clock time
- Response body size
- Decoded audio file size

**Artifacts**:
- `output/03-generate-story-audio-request.json`
- `output/03-generate-story-audio-response.json`
- `output/03-story-audio.mp3` (decoded from base64)
- `output/03-generate-story-audio-metrics.json`

### Step 4: Save Prompts

Extract and save the system and user prompts used by `generate-story`:

**Artifacts**:
- `output/00-prompts.md` — Contains the system prompt and constructed user prompt

### Step 5: Summary Metrics

**Artifact**: `output/00-summary-metrics.json`

Aggregate metrics:
- Total wall-clock time for all 3 functions
- Individual function times
- File sizes (response JSON, cover image, audio MP3)
- Story word count
- Audio duration estimate (if derivable from file size)

## Output Structure

```
output/
├── 00-prompts.md
├── 00-summary-metrics.json
├── 01-generate-story-request.json
├── 01-generate-story-response.json
├── 01-generate-story-metrics.json
├── 02-generate-cover-image-request.json
├── 02-generate-cover-image-response.json
├── 02-cover-image.png
├── 02-generate-cover-image-metrics.json
├── 03-generate-story-audio-request.json
├── 03-generate-story-audio-response.json
├── 03-story-audio.mp3
└── 03-generate-story-audio-metrics.json
```

## Test Data

Using sample values that match the app's data model:
- **Protagonist**: `barnaby` (Barnaby the Bear)
- **Child nickname**: Emma
- **Developmental stage**: `preschool`
- **Challenge category**: `bedtime` (Bedtime Friction)
- **Trigger**: `leaving_bedroom` (Leaving the bedroom)

## Notes

1. The `generate-cover-image` function uses `AI_GATEWAY_API_KEY` (BFL Flux model via AI SDK gateway)
2. The `generate-story` and `generate-story-audio` functions use `MIMO_API_KEY` (MiMo V2.5 Pro/TTS)
3. Cover image is 512x512 PNG
4. Audio is MP3 format, voice "Chloe" with gentle bedtime narration style
5. We need a valid `childId` — will create a test child profile via Supabase REST API or use an existing one

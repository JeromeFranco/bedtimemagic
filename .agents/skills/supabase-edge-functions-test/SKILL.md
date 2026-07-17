---
name: supabase-edge-functions-test
description: Test deployed Supabase Edge Functions via curl with full metrics and artifact collection. Use when the user asks to "test edge functions", "test supabase functions", "curl the functions", "smoke test functions", or wants to verify a deployed Supabase project's Edge Functions work correctly. Includes authentication, request/response logging, image/audio download, and timing metrics.
---

# Supabase Edge Functions Test

Test deployed Edge Functions via curl, saving all artifacts and metrics.

## Prerequisites

1. **Supabase Project URL**: Hosted URL (e.g., `https://xxxxx.supabase.co`)
2. **Supabase Publishable Key**: Starts with `sb_publishable_`
3. **curl** and **jq** installed

## Quick Start

### Test Full Pipeline (Story → Cover → Audio)

```bash
./scripts/test-pipeline.sh <SUPABASE_URL> <PUBLISHABLE_KEY>
```

Example:
```bash
./scripts/test-pipeline.sh https://bbmrjtlaqhvjtkxrbnqj.supabase.co sb_publishable_tKaS2KEAKmQwWu7FFR396Q_fU3D8Z1a
```

This will:
1. Authenticate anonymously
2. Create a test child profile
3. Call `generate-story`
4. Call `generate-cover-image`
5. Call `generate-story-audio`
6. Save all artifacts to `output/`

### Test Single Function

```bash
./scripts/test-single.sh <SUPABASE_URL> <PUBLISHABLE_KEY> <FUNCTION_NAME> [REQUEST_BODY]
```

Example:
```bash
./scripts/test-single.sh https://bbmrjtlaqhvjtkxrbnqj.supabase.co sb_publishable_tKaS2KEAKmQwWu7FFR396Q_fU3D8Z1a generate-story '{"childId":"...","protagonistId":"barnaby","childNickname":"Emma","developmentalStage":"preschool","tier1Challenge":"bedtime","tier2Trigger":"leaving_bedroom"}'
```

### Validate Saved Artifacts

```bash
./scripts/validate-output.sh output/
```

Checks that all expected files exist and are valid.

## Output Structure

```
output/
├── 00-auth.json                    # Auth token info
├── 00-prompts.md                   # System/user prompts used
├── 00-summary-metrics.json         # Aggregated metrics
├── 01-child-profile.json           # Created child profile
├── 02-generate-story-request.json  # Story request body
├── 02-generate-story-response.json # Story response
├── 02-generate-story-metrics.json  # Story timing/size
├── 03-generate-cover-image-request.json
├── 03-generate-cover-image-response.json
├── 03-cover-image.png              # Downloaded cover
├── 03-generate-cover-image-metrics.json
├── 04-generate-story-audio-request.json
├── 04-generate-story-audio-response.json
├── 04-story-audio.mp3              # Decoded audio
└── 04-generate-story-audio-metrics.json
```

## Metrics Collected

For each function:
- **Clock time**: Wall-clock milliseconds via `date +%s%N`
- **Response size**: Bytes of raw JSON response
- **File sizes**: Downloaded image (PNG) and decoded audio (MP3)
- **Story word count**: Words in generated story
- **Audio duration**: Estimated from file size (~16KB/s for MP3)

## Functions Reference

See `references/functions.md` for detailed function signatures, required fields, and example payloads.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Invalid or expired token | Re-run auth step |
| `403 Forbidden` | RLS policy violation | Ensure `user_id` matches JWT subject |
| `422 Safety filter triggered` | LLM refused to generate | Try different challenge/trigger combo |
| `500 MIMO_API_KEY not configured` | Missing env var on hosted project | Check Supabase dashboard Edge Function secrets |
| `502 LLM API error` | MiMo API timeout or overload | Retry after delay |

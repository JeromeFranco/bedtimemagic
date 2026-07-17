# Edge Functions Reference

## generate-story

Generates a bedtime story using MiMo V2.5 Pro LLM.

### Endpoint

```
POST /functions/v1/generate-story
```

### Request Body

```json
{
  "childId": "uuid",
  "protagonistId": "barnaby | nova | pip | luna | rex",
  "childNickname": "string",
  "developmentalStage": "preschool | early_primary | older_kids",
  "tier1Challenge": "screentime | emotions | bedtime | social",
  "tier2Trigger": "stopping_games | turning_off_tv | giving_back_tablet | yelling | hitting | tantrum_no | leaving_bedroom | refusing_teeth | staying_up_late | sharing_toys | telling_truth | chores_patience"
}
```

### Response (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "child_id": "uuid",
  "title": "string (3-8 words)",
  "story_text": "string (1200-1500 words)",
  "moral": "string (one sentence)",
  "pillow_talk_prompt": "string (open-ended question)",
  "sleepy_affirmation": "string (comforting phrase)",
  "cover_image_url": null,
  "challenge": "string (tier2Trigger)",
  "protagonist": "string (protagonistId)",
  "created_at": "ISO timestamp"
}
```

### Protagonists

| ID | Name | Species | Personality |
|----|------|---------|-------------|
| barnaby | Barnaby | Bear | Gentle, patient, loves warm hugs and honey |
| nova | Captain Nova | Star Pilot | Brave, curious, speaks with wonder |
| pip | Pip | Penguin | Playful, waddles, loves sliding on ice |
| luna | Luna | Owl | Wise, speaks softly, makes world magical |
| rex | Rex | Dragon | Friendly, breathes warm air, incredibly gentle |

### Developmental Stages

| ID | Label | Vocabulary | Sentences |
|----|-------|------------|-----------|
| preschool | Preschool (4-5) | Concrete, familiar objects | 5-8 words, repetition welcome |
| early_primary | Early Primary (6-7) | Mix familiar and new | 8-12 words, dialogue allowed |
| older_kids | Older Kids (8-10) | Richer, figurative language | 10-15 words, complex sentences |

---

## generate-cover-image

Generates a watercolor cover illustration using BFL Flux via AI SDK gateway.

### Endpoint

```
POST /functions/v1/generate-cover-image
```

### Request Body

```json
{
  "storyId": "uuid",
  "title": "string"
}
```

### Response (200)

```json
{
  "coverImageUrl": "https://xxx.supabase.co/storage/v1/object/public/covers/{storyId}.png"
}
```

### Notes

- Image size: 512x512 PNG
- Style: Soft, muted watercolor, pastel colors, dreamy atmosphere
- Stored in Supabase Storage `covers` bucket

---

## generate-story-audio

Generates TTS narration using MiMo V2.5 TTS.

### Endpoint

```
POST /functions/v1/generate-story-audio
```

### Request Body

```json
{
  "story_text": "string (max 5000 words)"
}
```

### Response (200)

```json
{
  "audio": "base64-encoded MP3"
}
```

### Notes

- Voice: Chloe
- Style: Gentle, warm, slow-paced bedtime narrator
- Format: MP3
- Max input: 5000 words

---

## Authentication

All functions require a valid JWT from Supabase Auth.

```
Authorization: Bearer <access_token>
```

### Anonymous Sign-In

```bash
curl -X POST "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"data":{}}'
```

Returns:
```json
{
  "access_token": "eyJ...",
  "user": {
    "id": "uuid",
    "is_anonymous": true
  }
}
```

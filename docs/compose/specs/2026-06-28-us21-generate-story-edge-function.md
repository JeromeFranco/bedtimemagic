# Spec: US-2.1 Generate Story Edge Function

**Date:** 2026-06-28
**User Story:** US-2.1 from `docs/user-stories.md`
**Includes:** US-0.1 (protagonist data), US-0.4 (prompt template)

---

## [S1] Problem

The app has a fully wired client flow (profile selector → challenge matrix → generate screen) but no backend to actually generate stories. The `generate-story` edge function doesn't exist, so the generate screen always errors. Additionally, protagonist personality data and the LLM prompt template (prerequisites from Phase 0) are missing.

## [S2] Solution Overview

Build a Supabase Edge Function (`generate-story`) that:
1. Receives story parameters from the client
2. Looks up protagonist personality/voice data
3. Builds a one-shot prompt for MiMo V2.5 Pro
4. Parses the structured JSON response
5. Persists the story to the `stories` table
6. Returns the full `Story` object to the client

Also: enrich protagonist data with personality descriptions and voice notes, create the prompt template, update the client API to pass required params, and fix the DB challenge constraint.

## [S3] Protagonist Data Enrichment

Extend `ProtagonistInfo` in `src/types/index.ts` with two new fields:

```typescript
export interface ProtagonistInfo {
  id: Protagonist;
  name: string;
  species: string;
  emoji: string;
  personality: string;    // NEW: 1-2 sentence personality description
  voiceNotes: string;     // NEW: TTS voice/tonality guidance
}
```

Update `PROTAGONISTS` array with personality and voice data:

| ID | Personality | Voice Notes |
|---|---|---|
| `barnaby` | Gentle, patient bear who loves warm hugs and honey. Always speaks slowly and kindly, making everyone feel safe. | Warm baritone, slow and comforting, like a cozy blanket |
| `nova` | Brave space explorer who's curious about every star. Speaks with wonder and excitement but calms down at bedtime. | Energetic but softening, like a campfire winding down |
| `pip` | Playful penguin who waddles everywhere and loves sliding on ice. Always giggling and making others laugh. | Cheerful and slightly squeaky, like a happy child |
| `luna` | Wise owl who sees everything from her tree. Speaks softly with ancient knowledge, making the world feel magical. | Whispery and mysterious, like rustling leaves at night |
| `rex` | Friendly dragon who breathes warm air and guards his friends fiercely. Despite his size, he's incredibly gentle. | Deep and rumbly but kind, like distant thunder fading |

## [S4] Prompt Template

Stored in `supabase/functions/generate-story/prompt.ts` as exported constants.

### System Prompt

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

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown fences, no explanation) with these exact fields:
{
  "title": "string — story title, 3-8 words",
  "storyText": "string — the full story, 1200-1500 words",
  "moral": "string — one sentence summarizing the lesson",
  "pillowTalkPrompt": "string — one gentle question for parent-child discussion",
  "sleepyAffirmation": "string — one comforting phrase for the child to fall asleep to"
}
```

### User Prompt Template

```
Write a bedtime story for a child nicknamed "{childNickname}".

PROTAGONIST: {protagonistName} the {protagonistSpecies}
Personality: {protagonistPersonality}

TONALITY: {protagonistVoiceNotes}

CHILD'S DEVELOPMENTAL STAGE: {developmentalStage}
(Adjust vocabulary and sentence complexity accordingly)

TONIGHT'S CHALLENGE:
Category: {tier1ChallengeLabel}
Specific situation: {tier2TriggerLabel}

Write a story where {protagonistName} helps {childNickname} understand and cope with this challenge. The story should end with {childNickname} feeling peaceful and ready for sleep.
```

## [S5] Edge Function: `generate-story`

### File Structure

```
supabase/functions/generate-story/
├── index.ts          # Deno.serve entry point
├── prompt.ts         # System + user prompt templates
└── deno.json         # Deno config with openai npm specifier
```

### Request Contract

```typescript
// POST /functions/v1/generate-story
// Authorization: Bearer <supabase-jwt>
interface GenerateStoryRequest {
  childId: string;           // UUID of child profile
  protagonistId: string;     // 'barnaby' | 'nova' | 'pip' | 'luna' | 'rex'
  childNickname: string;     // Child's display name
  developmentalStage: string; // 'preschool' | 'early_primary' | 'older_kids'
  tier1Challenge: string;    // ChallengeCategory id
  tier2Trigger: string;      // ChallengeTrigger id
}
```

### Response Contract

```typescript
// 200 OK — Full Story object matching DB row
interface GenerateStoryResponse {
  id: string;
  user_id: string;
  child_id: string;
  title: string;
  story_text: string;
  moral: string;
  pillow_talk_prompt: string;
  sleepy_affirmation: string;
  cover_image_url: null;    // Always null initially (US-2.3)
  challenge: string;         // tier2Trigger value
  protagonist: string;       // protagonistId value
  created_at: string;
}
```

### Error Responses

| Status | Condition | Body |
|---|---|---|
| 400 | Missing/invalid fields | `{ error: "..." }` |
| 401 | No valid JWT | `{ error: "Unauthorized" }` |
| 422 | Safety filter triggered | `{ error: "Story generation blocked by safety filter" }` |
| 500 | Malformed LLM output (after retry) | `{ error: "Failed to generate valid story" }` |
| 504 | LLM timeout (>60s) | `{ error: "Story generation timed out" }` |

### Flow

1. Parse + validate request body
2. Extract `user_id` from JWT via Supabase auth
3. Look up protagonist data from `PROTAGONISTS` constant (shared with client)
4. Build prompt from templates (system + filled user prompt)
5. Call MiMo V2.5 Pro at `https://api.xiaomimimo.com/v1` with 60s timeout
6. Parse response — strip markdown fences if present, `JSON.parse`
7. If parse fails: retry once with appended instruction "Return ONLY valid JSON"
8. If retry fails: return 500
9. Insert into `stories` table
10. Return the inserted row

### Environment Variables

- `MIMO_API_KEY` — already used by `generate-story-audio`, same key works
- `SUPABASE_URL` — auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — needed for DB insert (bypasses RLS)

## [S6] Client API Changes

### `src/api/stories.ts`

Update `generateStory()` signature:

```typescript
export async function generateStory(
  childId: string,
  protagonist: Protagonist,
  childNickname: string,
  developmentalStage: DevelopmentalStage,
  tier1Challenge: ChallengeCategory,
  tier2Trigger: ChallengeTrigger
): Promise<Story>
```

Update the `supabase.functions.invoke` call to pass all fields.

### `src/app/generate.tsx`

Update the mutation to pass additional profile fields:

```typescript
mutationFn: () =>
  generateStory(
    selectedProfile!.id,
    selectedProfile!.protagonist,
    selectedProfile!.name,           // nickname
    selectedProfile!.developmental_stage,
    category!,
    trigger!
  ),
```

## [S7] DB Migration

New migration file to update the `stories.challenge` CHECK constraint:

```sql
-- Drop old constraint
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_challenge_check;

-- Add new constraint matching ChallengeTrigger type
ALTER TABLE public.stories ADD CONSTRAINT stories_challenge_check
  CHECK (challenge IN (
    'stopping_games', 'turning_off_tv', 'giving_back_tablet',
    'yelling', 'hitting', 'tantrum_no',
    'leaving_bedroom', 'refusing_teeth', 'staying_up_late',
    'sharing_toys', 'telling_truth', 'chores_patience'
  ));
```

## [S8] Testing Strategy

- Unit test the prompt template (snapshot test: inputs → filled prompt)
- Unit test JSON parsing (strip markdown fences, handle malformed)
- Integration test the edge function locally via `supabase functions serve`
- Manual test: generate a story end-to-end from the app

## [S9] Out of Scope

- US-2.2 (sentence-level TTS streaming) — separate story
- US-2.3 (cover image generation) — separate story
- US-2.4 (story persistence is included, but history vault UI is separate)
- Rate limiting / free tier enforcement (Phase 6)

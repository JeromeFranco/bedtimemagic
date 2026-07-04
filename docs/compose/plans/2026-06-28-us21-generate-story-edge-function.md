# US-2.1 Generate Story Edge Function — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Supabase Edge Function that generates bedtime stories via MiMo V2.5 Pro, with supporting protagonist data, prompt template, client API updates, and DB migration.

**Architecture:** Edge Function receives story params, builds a one-shot prompt with protagonist personality data, calls MiMo V2.5 Pro, parses structured JSON, persists to `stories` table, returns the full Story object to the client.

**Tech Stack:** Deno (Edge Function runtime), `openai` npm package (MiMo API), Supabase (DB + auth), React Native client (`supabase.functions.invoke`)

## Global Constraints

- Edge Function runs on Deno with `openai` npm specifier (same pattern as `generate-story-audio`)
- MiMo V2.5 Pro endpoint: `https://api.xiaomimimo.com/v1`, auth via `MIMO_API_KEY` env var
- Story output must be valid JSON with fields: `title`, `story_text`, `moral`, `pillow_talk_prompt`, `sleepy_affirmation`
- Story text target: 1200–1500 words, sleep-appropriate tone, no PII
- All new code follows existing patterns in the codebase (types in `src/types/index.ts`, API in `src/api/stories.ts`)
- Conventional commits required

---

### Task 1: Enrich Protagonist Data

**Covers:** [S3]

**Files:**
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `ProtagonistInfo` with `personality` and `voiceNotes` fields, used by Task 3 (prompt template) and consumed by client

- [ ] **Step 1: Read current file**

Read `src/types/index.ts` to understand current structure.

- [ ] **Step 2: Add fields to ProtagonistInfo interface**

```typescript
export interface ProtagonistInfo {
  id: Protagonist;
  name: string;
  species: string;
  emoji: string;
  personality: string;
  voiceNotes: string;
}
```

- [ ] **Step 3: Update PROTAGONISTS array with personality and voice data**

```typescript
export const PROTAGONISTS: ProtagonistInfo[] = [
  {
    id: 'barnaby',
    name: 'Barnaby',
    species: 'Bear',
    emoji: '🐻',
    personality: 'Gentle, patient bear who loves warm hugs and honey. Always speaks slowly and kindly, making everyone feel safe.',
    voiceNotes: 'Warm baritone, slow and comforting, like a cozy blanket',
  },
  {
    id: 'nova',
    name: 'Captain Nova',
    species: 'Star Pilot',
    emoji: '🚀',
    personality: 'Brave space explorer who is curious about every star. Speaks with wonder and excitement but calms down at bedtime.',
    voiceNotes: 'Energetic but softening, like a campfire winding down',
  },
  {
    id: 'pip',
    name: 'Pip',
    species: 'Penguin',
    emoji: '🐧',
    personality: 'Playful penguin who waddles everywhere and loves sliding on ice. Always giggling and making others laugh.',
    voiceNotes: 'Cheerful and slightly squeaky, like a happy child',
  },
  {
    id: 'luna',
    name: 'Luna',
    species: 'Owl',
    emoji: '🦉',
    personality: 'Wise owl who sees everything from her tree. Speaks softly with ancient knowledge, making the world feel magical.',
    voiceNotes: 'Whispery and mysterious, like rustling leaves at night',
  },
  {
    id: 'rex',
    name: 'Rex',
    species: 'Dragon',
    emoji: '🐉',
    personality: 'Friendly dragon who breathes warm air and guards his friends fiercely. Despite his size, he is incredibly gentle.',
    voiceNotes: 'Deep and rumbly but kind, like distant thunder fading',
  },
];
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add protagonist personality and voice data"
```

---

### Task 2: DB Migration for Challenge Constraint

**Covers:** [S7]

**Files:**
- Create: `supabase/migrations/20260628000000_update_challenge_constraint.sql`

**Interfaces:**
- Produces: Updated `stories.challenge` CHECK constraint accepting all 12 `ChallengeTrigger` values

- [ ] **Step 1: Create migration file**

```sql
-- Update stories.challenge constraint to match ChallengeTrigger type
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_challenge_check;

ALTER TABLE public.stories ADD CONSTRAINT stories_challenge_check
  CHECK (challenge IN (
    'stopping_games', 'turning_off_tv', 'giving_back_tablet',
    'yelling', 'hitting', 'tantrum_no',
    'leaving_bedroom', 'refusing_teeth', 'staying_up_late',
    'sharing_toys', 'telling_truth', 'chores_patience'
  ));
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db push --local` or `npx supabase migration up`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260628000000_update_challenge_constraint.sql
git commit -m "feat: update stories challenge constraint to match ChallengeTrigger type"
```

---

### Task 3: Create Prompt Template

**Covers:** [S4]

**Files:**
- Create: `supabase/functions/generate-story/prompt.ts`

**Interfaces:**
- Consumes: `ProtagonistInfo` fields (name, species, personality, voiceNotes) — from Task 1
- Produces: `buildPrompt()` function returning `{ system: string; user: string }`, consumed by Task 4

- [ ] **Step 1: Create prompt.ts with templates**

```typescript
export interface PromptInput {
  protagonistName: string;
  protagonistSpecies: string;
  protagonistPersonality: string;
  protagonistVoiceNotes: string;
  childNickname: string;
  developmentalStage: string;
  tier1ChallengeLabel: string;
  tier2TriggerLabel: string;
}

const SYSTEM_PROMPT = `You are a children's bedtime story author. You write calming, sleep-appropriate stories that help children aged 4-10 process behavioral challenges through gentle narrative.

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
}`;

function buildUserPrompt(input: PromptInput): string {
  return `Write a bedtime story for a child nicknamed "${input.childNickname}".

PROTAGONIST: ${input.protagonistName} the ${input.protagonistSpecies}
Personality: ${input.protagonistPersonality}

TONALITY: ${input.protagonistVoiceNotes}

CHILD'S DEVELOPMENTAL STAGE: ${input.developmentalStage}
(Adjust vocabulary and sentence complexity accordingly)

TONIGHT'S CHALLENGE:
Category: ${input.tier1ChallengeLabel}
Specific situation: ${input.tier2TriggerLabel}

Write a story where ${input.protagonistName} helps ${input.childNickname} understand and cope with this challenge. The story should end with ${input.childNickname} feeling peaceful and ready for sleep.`;
}

export function buildPrompt(input: PromptInput): { system: string; user: string } {
  return {
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(input),
  };
}
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit` (this is Deno code, but check for syntax issues)
Expected: No syntax errors in the file (Deno files aren't checked by project tsc)

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/generate-story/prompt.ts
git commit -m "feat: add story generation prompt template"
```

---

### Task 4: Build Edge Function

**Covers:** [S5]

**Files:**
- Create: `supabase/functions/generate-story/index.ts`
- Create: `supabase/functions/generate-story/deno.json`

**Interfaces:**
- Consumes: `buildPrompt()` from Task 3, `ProtagonistInfo`/`PROTAGONISTS` type (re-imported or duplicated for Deno)
- Produces: HTTP endpoint accepting `GenerateStoryRequest`, returning `Story` object
- Endpoint: `POST /functions/v1/generate-story`

- [ ] **Step 1: Create deno.json**

```json
{
  "imports": {
    "openai": "npm:openai@6.42.0"
  }
}
```

- [ ] **Step 2: Create index.ts**

```typescript
import OpenAI from "openai";
import { buildPrompt, type PromptInput } from "./prompt.ts";

const MODEL = "mimo-v2.5-pro";
const TIMEOUT_MS = 60_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  childId: string;
  protagonistId: string;
  childNickname: string;
  developmentalStage: string;
  tier1Challenge: string;
  tier2Trigger: string;
}

const PROTAGONISTS: Record<string, { name: string; species: string; personality: string; voiceNotes: string }> = {
  barnaby: {
    name: "Barnaby",
    species: "Bear",
    personality: "Gentle, patient bear who loves warm hugs and honey. Always speaks slowly and kindly, making everyone feel safe.",
    voiceNotes: "Warm baritone, slow and comforting, like a cozy blanket",
  },
  nova: {
    name: "Captain Nova",
    species: "Star Pilot",
    personality: "Brave space explorer who is curious about every star. Speaks with wonder and excitement but calms down at bedtime.",
    voiceNotes: "Energetic but softening, like a campfire winding down",
  },
  pip: {
    name: "Pip",
    species: "Penguin",
    personality: "Playful penguin who waddles everywhere and loves sliding on ice. Always giggling and making others laugh.",
    voiceNotes: "Cheerful and slightly squeaky, like a happy child",
  },
  luna: {
    name: "Luna",
    species: "Owl",
    personality: "Wise owl who sees everything from her tree. Speaks softly with ancient knowledge, making the world feel magical.",
    voiceNotes: "Whispery and mysterious, like rustling leaves at night",
  },
  rex: {
    name: "Rex",
    species: "Dragon",
    personality: "Friendly dragon who breathes warm air and guards his friends fiercely. Despite his size, he is incredibly gentle.",
    voiceNotes: "Deep and rumbly but kind, like distant thunder fading",
  },
};

const CHALLENGE_LABELS: Record<string, string> = {
  screentime: "Screen Time Limits",
  emotions: "Big Emotions / Anger",
  bedtime: "Bedtime Friction",
  social: "Social Skills",
};

const TRIGGER_LABELS: Record<string, string> = {
  stopping_games: "Stopping video games",
  turning_off_tv: "Turning off the TV",
  giving_back_tablet: "Giving back the tablet",
  yelling: "Yelling",
  hitting: "Hitting/Pushing",
  tantrum_no: "Tantrum when told 'No'",
  leaving_bedroom: "Leaving the bedroom",
  refusing_teeth: "Refusing to brush teeth",
  staying_up_late: "Wanting to stay up late",
  sharing_toys: "Sharing toys",
  telling_truth: "Telling the truth",
  chores_patience: "Chores and Patience",
};

const STAGE_LABELS: Record<string, string> = {
  preschool: "Preschool",
  early_primary: "Early Primary",
  older_kids: "Older Kids",
};

function parseJsonResponse(text: string): Record<string, string> {
  const cleaned = text.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

async function callLLM(
  client: OpenAI,
  system: string,
  user: string,
  retry = false
): Promise<Record<string, string>> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    {
      role: "user",
      content: retry
        ? `${user}\n\nIMPORTANT: Return ONLY valid JSON. No markdown fences, no explanation, no extra text.`
        : user,
    },
  ];

  const completion = await client.chat.completions.create(
    {
      model: MODEL,
      messages,
    },
    { timeout: TIMEOUT_MS }
  );

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from model");

  return parseJsonResponse(content);
}

async function getSupabaseAdmin() {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getUserFromJwt(authHeader: string): Promise<string> {
  const supabase = await getSupabaseAdmin();
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized");
  return user.id;
}

async function persistStory(
  userId: string,
  body: RequestBody,
  story: Record<string, string>
) {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("stories")
    .insert({
      user_id: userId,
      child_id: body.childId,
      title: story.title,
      story_text: story.storyText,
      moral: story.moral,
      pillow_talk_prompt: story.pillowTalkPrompt,
      sleepy_affirmation: story.sleepyAffirmation,
      cover_image_url: null,
      challenge: body.tier2Trigger,
      protagonist: body.protagonistId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("MIMO_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "MIMO_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!body.childId || !body.protagonistId || !body.childNickname || !body.developmentalStage || !body.tier1Challenge || !body.tier2Trigger) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const protagonist = PROTAGONISTS[body.protagonistId];
  if (!protagonist) {
    return new Response(
      JSON.stringify({ error: "Invalid protagonist" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let userId: string;
  try {
    userId = await getUserFromJwt(authHeader);
  } catch {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.xiaomimimo.com/v1",
  });

  const promptInput: PromptInput = {
    protagonistName: protagonist.name,
    protagonistSpecies: protagonist.species,
    protagonistPersonality: protagonist.personality,
    protagonistVoiceNotes: protagonist.voiceNotes,
    childNickname: body.childNickname,
    developmentalStage: STAGE_LABELS[body.developmentalStage] || body.developmentalStage,
    tier1ChallengeLabel: CHALLENGE_LABELS[body.tier1Challenge] || body.tier1Challenge,
    tier2TriggerLabel: TRIGGER_LABELS[body.tier2Trigger] || body.tier2Trigger,
  };

  const { system, user } = buildPrompt(promptInput);

  let story: Record<string, string>;
  try {
    story = await callLLM(client, system, user);
  } catch (err) {
    if (err instanceof SyntaxError) {
      // JSON parse failed — retry once
      try {
        story = await callLLM(client, system, user, true);
      } catch {
        return new Response(
          JSON.stringify({ error: "Failed to generate valid story" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (err instanceof Error && err.message.includes("timeout")) {
      return new Response(
        JSON.stringify({ error: "Story generation timed out" }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      throw err;
    }
  }

  let savedStory;
  try {
    savedStory = await persistStory(userId, body, story);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to save story" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify(savedStory), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

if (import.meta.main) {
  Deno.serve(handleRequest);
}
```

- [ ] **Step 3: Test locally with supabase functions serve**

Run: `npx supabase functions serve generate-story --no-verify-jwt`
Then: `curl -X POST http://localhost:54321/functions/v1/generate-story -H "Content-Type: application/json" -d '{"childId":"test","protagonistId":"barnaby","childNickname":"Buddy","developmentalStage":"early_primary","tier1Challenge":"bedtime","tier2Trigger":"leaving_bedroom"}'`
Expected: JSON response with story fields (or auth error if JWT required)

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/generate-story/
git commit -m "feat: add generate-story edge function with LLM integration"
```

---

### Task 5: Update Client API

**Covers:** [S6]

**Files:**
- Modify: `src/api/stories.ts`
- Modify: `src/app/generate.tsx`

**Interfaces:**
- Consumes: `ProtagonistInfo` with `personality` and `voiceNotes` (Task 1), `ChildProfile` with `name` and `developmental_stage`
- Produces: Updated `generateStory()` function signature

- [ ] **Step 1: Update generateStory signature in stories.ts**

```typescript
import type { Story, ChallengeTrigger, ChallengeCategory, Protagonist, DevelopmentalStage, StoryRating } from '@/types';

export async function generateStory(
  childId: string,
  protagonist: Protagonist,
  childNickname: string,
  developmentalStage: DevelopmentalStage,
  tier1Challenge: ChallengeCategory,
  tier2Trigger: ChallengeTrigger
): Promise<Story> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('generate-story', {
    body: {
      childId,
      protagonistId: protagonist,
      childNickname,
      developmentalStage,
      tier1Challenge,
      tier2Trigger,
    },
  });

  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Update generate.tsx to pass additional fields**

```typescript
const mutation = useMutation({
  mutationFn: () =>
    generateStory(
      selectedProfile!.id,
      selectedProfile!.protagonist,
      selectedProfile!.name,
      selectedProfile!.developmental_stage,
      category!,
      trigger!
    ),
  onSuccess: (story) => {
    router.replace({
      pathname: '/story',
      params: { story: JSON.stringify(story) },
    });
  },
});
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Run lint**

Run: `npx eslint src/api/stories.ts src/app/generate.tsx`
Expected: PASS (or fix any issues)

- [ ] **Step 5: Commit**

```bash
git add src/api/stories.ts src/app/generate.tsx
git commit -m "feat: update client API to pass nickname and developmental stage"
```

---

### Task 6: End-to-End Verification

**Covers:** [S5, S6]

**Files:** None (verification only)

- [ ] **Step 1: Run full typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `npx eslint src/`
Expected: PASS

- [ ] **Step 3: Test edge function locally**

Run: `npx supabase functions serve generate-story`
Test with a valid JWT from the app or test client.
Expected: 200 response with valid Story JSON

- [ ] **Step 4: Verify Story object shape matches types/index.ts Story interface**

Check that response has: `id`, `user_id`, `child_id`, `title`, `story_text`, `moral`, `pillow_talk_prompt`, `sleepy_affirmation`, `cover_image_url`, `challenge`, `protagonist`, `created_at`

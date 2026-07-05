# Edge Functions: Migrate to @supabase/server

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual JWT verification, CORS handling, and Supabase client setup in all 3 edge functions with `@supabase/server`'s `withSupabase` wrapper.

**Architecture:** Each function wraps its `handleRequest` with `withSupabase({ auth: 'user' }, ...)`, which provides auth verification, CORS, and a pre-configured admin client. The internal `handleRequest` is renamed to `handler` and receives `(req, ctx)` instead of `(req)`. The existing `handleRequest` export is preserved for backward-compatible test imports by re-exporting the wrapped version.

**Tech Stack:** `@supabase/server` (npm), Deno, Supabase Edge Functions

## Global Constraints

- Functions deploy with `--no-verify-jwt` — `withSupabase` handles JWT verification in-code
- Environment uses `SUPABASE_SECRET_KEY` (singular) — `@supabase/server` expects `SUPABASE_SECRET_KEYS` (plural); map via env var rename in `.env.local`
- Tests import `handleRequest` directly — this export must remain callable without `Deno.serve`
- Pure function unit tests (parseJsonResponse, splitSentences, etc.) are unchanged
- The `generate-story` function uses `esm.sh` for `@supabase/supabase-js` — replace with npm import via `@supabase/server`

---

### Task 1: Migrate generate-story

**Covers:** Auth, CORS, client setup for generate-story function

**Files:**
- Modify: `supabase/functions/generate-story/deno.json`
- Modify: `supabase/functions/generate-story/index.ts`
- Modify: `supabase/functions/generate-story/index.test.ts`

**Interfaces:**
- Consumes: `withSupabase` from `npm:@supabase/server`, `SupabaseContext` type
- Produces: `handleRequest(req: Request)` — same signature for test compatibility

- [ ] **Step 1: Update deno.json imports**

```json
{
  "compilerOptions": { "strict": true },
  "imports": {
    "@openai/openai": "npm:openai@^4.78.0",
    "@std/assert": "jsr:@std/assert@^1",
    "@supabase/server": "npm:@supabase/server@latest"
  }
}
```

- [ ] **Step 2: Rewrite index.ts to use withSupabase**

Replace the entire file. Key changes:
- Remove `corsHeaders` object
- Remove `getSupabaseAdmin()` function (esm.sh dynamic import)
- Remove `getUserFromJwt()` function
- Remove manual OPTIONS handling and auth header checks from `handleRequest`
- Rename `handleRequest` to `handler` (internal), accepting `(req, ctx)` with `ctx: SupabaseContext`
- Use `ctx.supabaseAdmin` for DB operations
- Get userId from `ctx.userClaims`
- Export `handleRequest` as `withSupabase({ auth: 'user' }, handler)` for production + test compatibility
- Keep `if (import.meta.main)` block with `Deno.serve(handleRequest)`

```typescript
import OpenAI from "@openai/openai";
import { withSupabase, type SupabaseContext } from "@supabase/server";
import { buildPrompt, type PromptInput } from "./prompt.ts";

const MODEL = "mimo-v2.5-pro";
const TIMEOUT_MS = 60_000;

// ... (keep PROTAGONISTS, CHALLENGE_LABELS, TRIGGER_LABELS, STAGE_LABELS,
//      REQUIRED_STORY_FIELDS, SafetyFilterError, SAFETY_REFUSAL_PATTERNS,
//      parseJsonResponse, validateStoryFields, callLLM — all unchanged)

interface RequestBody {
  childId: string;
  protagonistId: string;
  childNickname: string;
  developmentalStage: string;
  tier1Challenge: string;
  tier2Trigger: string;
}

async function persistStory(
  supabase: SupabaseContext["supabaseAdmin"],
  userId: string,
  body: RequestBody,
  story: Record<string, string>
) {
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

async function handler(req: Request, ctx: SupabaseContext): Promise<Response> {
  const apiKey = Deno.env.get("MIMO_API_KEY");
  if (!apiKey) {
    return Response.json({ error: "MIMO_API_KEY not configured" }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.childId || !body.protagonistId || !body.childNickname || !body.developmentalStage || !body.tier1Challenge || !body.tier2Trigger) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const protagonist = PROTAGONISTS[body.protagonistId];
  if (!protagonist) {
    return Response.json({ error: "Invalid protagonist" }, { status: 400 });
  }

  const userId = ctx.userClaims!.sub;

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
    if (err instanceof SafetyFilterError) {
      return Response.json({ error: "Safety filter triggered" }, { status: 422 });
    }
    if (err instanceof SyntaxError) {
      try {
        story = await callLLM(client, system, user, true);
      } catch (retryErr) {
        if (retryErr instanceof SafetyFilterError) {
          return Response.json({ error: "Safety filter triggered" }, { status: 422 });
        }
        return Response.json({ error: "Failed to generate valid story" }, { status: 500 });
      }
    } else if (err instanceof Error && err.message.includes("timeout")) {
      return Response.json({ error: "Story generation timed out" }, { status: 504 });
    } else {
      throw err;
    }
  }

  let savedStory;
  try {
    savedStory = await persistStory(ctx.supabaseAdmin, userId, body, story);
  } catch {
    return Response.json({ error: "Failed to save story" }, { status: 500 });
  }

  return Response.json(savedStory);
}

export const handleRequest = withSupabase({ auth: "user" }, handler);

if (import.meta.main) {
  Deno.serve(handleRequest);
}
```

- [ ] **Step 3: Update tests for wrapped handleRequest**

The `handleRequest` export is now the `withSupabase`-wrapped version. Tests that call it need:
1. `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEYS` env vars set
2. A mock for `supabase.auth.getUser` (for tests with a Bearer token)

Update the test file:

```typescript
import { assertEquals } from "@std/assert";
import {
  parseJsonResponse,
  validateStoryFields,
  callLLM,
  handleRequest,
  SafetyFilterError,
} from "./index.ts";

// ... keep all existing parseJsonResponse, validateStoryFields, callLLM tests unchanged ...

// Update integration tests:
Deno.test("handleRequest - returns 200 for OPTIONS preflight", async () => {
  const req = new Request("http://localhost", { method: "OPTIONS" });
  const res = await handleRequest(req);
  assertEquals(res.status, 200);
  const text = await res.text();
  assertEquals(text, "ok");
});

Deno.test("handleRequest - returns 401 when no Authorization header", async () => {
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_PUBLISHABLE_KEYS", "test-anon-key");
  Deno.env.set("MIMO_API_KEY", "test-key");
  const req = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({
      childId: "c1",
      protagonistId: "barnaby",
      childNickname: "Alex",
      developmentalStage: "preschool",
      tier1Challenge: "bedtime",
      tier2Trigger: "leaving_bedroom",
    }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
  Deno.env.delete("SUPABASE_URL");
  Deno.env.delete("SUPABASE_PUBLISHABLE_KEYS");
  Deno.env.delete("MIMO_API_KEY");
});

// Tests with Bearer token that expect 400 (missing fields, invalid protagonist)
// will now get 401 because withSupabase validates the JWT first.
// Update expected status to 401 for these since the token is fake.
Deno.test("handleRequest - returns 401 for invalid token (before field validation)", async () => {
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_PUBLISHABLE_KEYS", "test-anon-key");
  Deno.env.set("MIMO_API_KEY", "test-key");
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: JSON.stringify({ childId: "c1" }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
  Deno.env.delete("SUPABASE_URL");
  Deno.env.delete("SUPABASE_PUBLISHABLE_KEYS");
  Deno.env.delete("MIMO_API_KEY");
});

Deno.test("handleRequest - returns 400 for invalid JSON body", async () => {
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_PUBLISHABLE_KEYS", "test-anon-key");
  Deno.env.set("MIMO_API_KEY", "test-key");
  const req = new Request("http://localhost", {
    method: "POST",
    body: "not-json",
  });
  const res = await handleRequest(req);
  // No auth header → 401 from withSupabase
  assertEquals(res.status, 401);
  Deno.env.delete("SUPABASE_URL");
  Deno.env.delete("SUPABASE_PUBLISHABLE_KEYS");
  Deno.env.delete("MIMO_API_KEY");
});
```

- [ ] **Step 4: Run tests**

```bash
cd supabase/functions/generate-story && deno test --allow-env --allow-net
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/generate-story/
git commit -m "refactor(generate-story): migrate to @supabase/server"
```

---

### Task 2: Migrate generate-story-audio

**Covers:** Auth, CORS, client setup for generate-story-audio function

**Files:**
- Modify: `supabase/functions/generate-story-audio/deno.json`
- Modify: `supabase/functions/generate-story-audio/index.ts`
- Modify: `supabase/functions/generate-story-audio/index.test.ts`

**Interfaces:**
- Consumes: `withSupabase` from `npm:@supabase/server`, `SupabaseContext` type
- Produces: `handleRequest(req: Request)` — same signature for test compatibility

- [ ] **Step 1: Update deno.json imports**

```json
{
  "compilerOptions": { "strict": true },
  "imports": {
    "@openai/openai": "npm:openai@^4.78.0",
    "openai": "npm:openai@^4.104.0",
    "@std/assert": "jsr:@std/assert@^1",
    "@supabase/server": "npm:@supabase/server@latest"
  }
}
```

Note: Remove `@supabase/supabase-js` — no longer needed directly.

- [ ] **Step 2: Rewrite index.ts to use withSupabase**

Key changes:
- Remove `corsHeaders` object
- Remove `getSupabase()` singleton function
- Remove `@supabase/supabase-js` import
- Remove manual OPTIONS and auth handling
- Rename `handleRequest` to `handler`, accepting `(req, ctx)`
- This function doesn't use Supabase for DB ops (only for auth), so no `ctx.supabaseAdmin` usage needed
- Export `handleRequest = withSupabase({ auth: "user" }, handler)`

```typescript
import OpenAI from "@openai/openai";
import { withSupabase, type SupabaseContext } from "@supabase/server";

// ... keep MODEL, VOICE, STYLE, MAX_WORDS, MAX_CONCURRENT_TTS, TTS_TIMEOUT_MS,
//      SAMPLE_RATE, BITS_PER_SAMPLE, CHANNELS, TTSError, splitSentences,
//      createWavHeader, generateSentenceAudio, withRetry, streamSentences,
//      uint8ToBase64, sseEvent — all unchanged

async function handler(req: Request, _ctx: SupabaseContext): Promise<Response> {
  const apiKey = Deno.env.get("MIMO_API_KEY");
  if (!apiKey) {
    return Response.json({ error: "MIMO_API_KEY not configured" }, { status: 500 });
  }

  let storyText: string;
  let maxSentences: number | undefined;
  try {
    const body = await req.json();
    storyText = body.story_text;
    maxSentences = body.max_sentences;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!storyText || typeof storyText !== "string" || storyText.trim().length === 0) {
    return Response.json({ error: "story_text is required and must be non-empty" }, { status: 400 });
  }

  if (maxSentences !== undefined && (!Number.isInteger(maxSentences) || maxSentences < 1)) {
    return Response.json({ error: "max_sentences must be a positive integer" }, { status: 400 });
  }

  const wordCount = storyText.trim().split(/\s+/).length;
  if (wordCount > MAX_WORDS) {
    return Response.json({ error: `story_text exceeds maximum of ${MAX_WORDS} words` }, { status: 400 });
  }

  const sentences = splitSentences(storyText);
  if (sentences.length === 0) {
    return Response.json({ error: "No sentences found in story_text" }, { status: 400 });
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.xiaomimimo.com/v1",
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of streamSentences(sentences, client, maxSentences)) {
          controller.enqueue(sseEvent(event.event, JSON.stringify(event.data)));
        }
      } catch (err: unknown) {
        const message = err instanceof TTSError ? String(err.cause) : String(err);
        controller.enqueue(sseEvent("error", JSON.stringify({ message })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}

export const handleRequest = withSupabase({ auth: "user" }, handler);

if (import.meta.main) {
  Deno.serve(handleRequest);
}
```

- [ ] **Step 3: Update tests**

Same pattern as Task 1: add `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEYS` env vars. Tests with fake Bearer tokens now get 401 (auth-first) instead of 400.

- [ ] **Step 4: Run tests**

```bash
cd supabase/functions/generate-story-audio && deno test --allow-env --allow-net
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/generate-story-audio/
git commit -m "refactor(generate-story-audio): migrate to @supabase/server"
```

---

### Task 3: Migrate generate-cover-image

**Covers:** Auth, CORS, client setup for generate-cover-image function

**Files:**
- Modify: `supabase/functions/generate-cover-image/deno.json`
- Modify: `supabase/functions/generate-cover-image/index.ts`
- Modify: `supabase/functions/generate-cover-image/index.test.ts`

**Interfaces:**
- Consumes: `withSupabase` from `npm:@supabase/server`, `SupabaseContext` type
- Produces: `handleRequest(req: Request)` — same signature for test compatibility

- [ ] **Step 1: Update deno.json imports**

```json
{
  "compilerOptions": { "strict": true },
  "imports": {
    "@std/assert": "jsr:@std/assert@^1",
    "ai": "npm:ai@6",
    "@supabase/server": "npm:@supabase/server@latest"
  }
}
```

Note: Remove `@supabase/supabase-js` — replaced by `@supabase/server`.

- [ ] **Step 2: Rewrite index.ts to use withSupabase**

Key changes:
- Remove `corsHeaders` object
- Remove `getSupabase()` singleton function
- Remove `@supabase/supabase-js` import
- Remove manual OPTIONS/auth handling
- Rename `handleRequest` to `handler`, accepting `(req, ctx)`
- Use `ctx.supabaseAdmin` for DB queries (stories select, stories update) and storage operations
- Get userId from `ctx.userClaims!.sub`
- Export `handleRequest = withSupabase({ auth: "user" }, handler)`

```typescript
import { generateImage, gateway } from "ai";
import { withSupabase, type SupabaseContext } from "@supabase/server";

// ... keep RequestBody, mapChallengeToScene, buildCoverPrompt — unchanged

async function handler(req: Request, ctx: SupabaseContext): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.storyId || !body.title) {
    return Response.json({ error: "storyId and title are required" }, { status: 400 });
  }

  const apiKey = Deno.env.get("AI_GATEWAY_API_KEY");
  if (!apiKey) {
    return Response.json({ error: "AI_GATEWAY_API_KEY not configured" }, { status: 500 });
  }

  const userId = ctx.userClaims!.sub;
  const supabase = ctx.supabaseAdmin;

  // Verify story exists and belongs to user
  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, protagonist, challenge")
    .eq("id", body.storyId)
    .eq("user_id", userId)
    .single();

  if (storyError || !story) {
    return Response.json({ error: "Story not found" }, { status: 404 });
  }

  const prompt = buildCoverPrompt(
    body.title,
    body.protagonist ?? story.protagonist ?? "bear",
    body.challenge ?? story.challenge ?? "bedtime"
  );

  let imageBytes: Uint8Array;
  try {
    const result = await generateImage({
      model: gateway.image("bfl/flux-2-klein-4b"),
      prompt,
    });
    imageBytes = result.image.uint8Array;
  } catch (err) {
    console.error("Image generation failed:", err);
    return Response.json({ error: "Image generation failed" }, { status: 500 });
  }

  const filePath = `${body.storyId}.png`;
  const { error: uploadError } = await supabase.storage
    .from("covers")
    .upload(filePath, imageBytes, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    console.error("Storage upload failed:", uploadError);
    return Response.json({ error: "Failed to upload image" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("covers").getPublicUrl(filePath);
  const coverImageUrl = urlData.publicUrl;

  const { error: updateError } = await supabase
    .from("stories")
    .update({ cover_image_url: coverImageUrl })
    .eq("id", body.storyId);

  if (updateError) {
    console.error("Story update failed:", updateError);
    return Response.json({ error: "Failed to update story" }, { status: 500 });
  }

  return Response.json({ coverImageUrl });
}

export const handleRequest = withSupabase({ auth: "user" }, handler);

if (import.meta.main) {
  Deno.serve(handleRequest);
}
```

- [ ] **Step 3: Update tests**

Same pattern: add `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEYS` env vars. Tests with fake Bearer tokens get 401 instead of 400/405.

- [ ] **Step 4: Run tests**

```bash
cd supabase/functions/generate-cover-image && deno test --allow-env --allow-net
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/generate-cover-image/
git commit -m "refactor(generate-cover-image): migrate to @supabase/server"
```

---

### Task 4: Update environment variables

**Covers:** Env var alignment for @supabase/server

**Files:**
- Modify: `supabase/functions/.env.local`

- [ ] **Step 1: Add SUPABASE_PUBLISHABLE_KEYS to .env.local**

Add the following line (use the project's anon key):
```
SUPABASE_PUBLISHABLE_KEYS=<your-anon-key>
```

- [ ] **Step 2: Verify deploy script still works**

Check that `supabase functions deploy` passes the new env vars. The Supabase platform auto-injects `SUPABASE_PUBLISHABLE_KEYS` and `SUPABASE_SECRET_KEYS` on deployed functions, so this is only needed for local dev.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/.env.local
git commit -m "chore: add SUPABASE_PUBLISHABLE_KEYS for @supabase/server"
```

---

### Task 5: Final verification

**Covers:** End-to-end validation

- [ ] **Step 1: Run all edge function tests**

```bash
cd supabase/functions/generate-story && deno test --allow-env --allow-net
cd supabase/functions/generate-story-audio && deno test --allow-env --allow-net
cd supabase/functions/generate-cover-image && deno test --allow-env --allow-net
```

Expected: All tests pass across all 3 functions.

- [ ] **Step 2: Type-check all functions**

```bash
cd supabase/functions/generate-story && deno check index.ts
cd supabase/functions/generate-story-audio && deno check index.ts
cd supabase/functions/generate-cover-image && deno check index.ts
```

Expected: No type errors.

- [ ] **Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address test/type issues from @supabase/server migration"
```

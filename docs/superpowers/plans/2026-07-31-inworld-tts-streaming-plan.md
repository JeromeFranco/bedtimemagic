# Inworld TTS Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace proxied MiMo story audio with authenticated, client-side Inworld `inworld-tts-1.5-mini` segment streaming, progressive `expo-audio` playback, and per-segment local caching.

**Architecture:** An authenticated `generate-inworld-token` Supabase Edge Function mints short-lived Inworld JWTs without exposing the API credential. The Expo client uses `@inworld/tts` to stream sentence-aware MP3 segments sequentially, writes completed segments to the device cache, and gives completed segment URIs to an ordered player coordinator. The existing player context remains the public UI state boundary; segmentation, token handling, TTS, cache, and playback coordination stay in focused library modules.

**Tech Stack:** Expo SDK 56, React Native 0.85, `expo-audio`, `expo-file-system`, Supabase Edge Functions with Deno 2, `@supabase/server`, `@inworld/tts` 1.1.1, Jest, Deno tests, TypeScript.

---

## Approved Write Allowlist

Only modify or create these files while executing this plan. Do not modify the existing user change in `AGENTS.md`.

- `package.json`
- `package-lock.json`
- `.env.example`
- `src/lib/story-segments.ts`
- `src/lib/__tests__/story-segments.test.ts`
- `src/lib/inworld-tts.ts`
- `src/lib/__tests__/inworld-tts.test.ts`
- `src/lib/audio-cache.ts`
- `src/lib/__tests__/audio-cache.test.ts`
- `src/lib/audio-utils.ts`
- `src/lib/__tests__/audio-utils.test.ts`
- `src/lib/audio-stream.ts`
- `src/lib/__tests__/audio-stream.test.ts`
- `src/contexts/PlayerContext.tsx`
- `src/contexts/__tests__/PlayerContext.test.tsx`
- `src/app/(index,explore)/story.tsx`
- `src/app/__tests__/story.test.tsx`
- `supabase/functions/generate-inworld-token/index.ts`
- `supabase/functions/generate-inworld-token/deno.json`
- `supabase/functions/deno.json`
- `supabase/functions/tests/generate-inworld-token/index.test.ts`
- `supabase/functions/generate-story-audio/index.ts`
- `supabase/functions/generate-story-audio/deno.json`
- `supabase/functions/tests/generate-story-audio/index.test.ts`
- `package-lock.json`

## File Map

- `src/lib/story-segments.ts`: Pure sentence-aware segmentation with an 1,800-character target and clause fallback.
- `src/lib/inworld-tts.ts`: In-memory JWT acquisition, SDK construction, sequential segment streaming, and byte accumulation.
- `src/lib/audio-cache.ts`: Segment-indexed MP3 paths, complete-file lookup/write, story-level eviction, and existing cover cache behavior.
- `src/lib/audio-utils.ts`: Story-level segment prefetch and cache-aware audio orchestration; retain ambient audio helpers.
- `src/contexts/PlayerContext.tsx`: Segment queue lifecycle, progressive player replacement, buffering, stale-request guards, and existing post-story phases.
- `supabase/functions/generate-inworld-token/index.ts`: Authenticated HMAC-signed Inworld JWT exchange.
- `supabase/functions/generate-story-audio/*`: Retired proxy and tests removed after all client consumers migrate.

## Task 1: Verify the SDK Boundary and Add the Approved Dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`

- [ ] **Step 1: Inspect the installed toolchain and SDK package metadata**

Run:

```bash
node --version
npm --version
npm view @inworld/tts@1.1.1 version dependencies engines dist.tarball
```

Expected: the package resolves as version `1.1.1`, has the published package metadata, and does not add an unapproved runtime dependency beyond the SDK itself.

- [ ] **Step 2: Install the explicitly approved SDK version**

Run:

```bash
npm install @inworld/tts@1.1.1 --save-exact
```

Expected: `package.json` contains exactly `"@inworld/tts": "1.1.1"`, and `package-lock.json` is updated.

- [ ] **Step 3: Add only non-secret environment documentation**

Add the server secret name to `.env.example` without adding a value or exposing it as an Expo public variable:

```dotenv
IN_WORLD_API_KEY=server-only-inworld-basic-credential
```

Do not copy the value from `.env.local` into any tracked file. The client must never read this variable.

- [ ] **Step 4: Run the required client checks before implementation continues**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: both commands exit `0`. If the SDK import fails typechecking or bundling, capture the exact error and stop rather than replacing the SDK with REST calls.

- [ ] **Step 5: Commit the dependency boundary**

```bash
git add package.json package-lock.json .env.example
git commit -m "feat: add Inworld TTS client SDK"
```

## Task 2: Implement and Test Sentence-Aware Segmentation

**Files:**
- Create: `src/lib/story-segments.ts`
- Create: `src/lib/__tests__/story-segments.test.ts`

- [ ] **Step 1: Write failing tests for normal sentence grouping**

Define the public type and expected behavior through tests:

```ts
import { splitStoryIntoSegments } from '../story-segments';

it('groups complete sentences without exceeding 1800 characters', () => {
  const sentences = Array.from({ length: 20 }, (_, index) => `Sentence ${index + 1}.`);
  const segments = splitStoryIntoSegments(sentences.join(' '));

  expect(segments.length).toBeGreaterThan(1);
  expect(segments.every((segment) => segment.length <= 1800)).toBe(true);
  expect(segments.every((segment) => /[.!?]["')\]]?$/.test(segment))).toBe(true);
  expect(segments.join(' ')).toBe(sentences.join(' '));
});

it('preserves punctuation and avoids empty segments', () => {
  const text = 'Wait... Really?! “Yes,” said Pip.  Then they rested.';
  const segments = splitStoryIntoSegments(text);

  expect(segments.every((segment) => segment.trim().length > 0)).toBe(true);
  expect(segments.join(' ')).toBe(text);
});
```

- [ ] **Step 2: Write failing tests for an oversized sentence**

```ts
it('uses clause boundaries for a sentence longer than 1800 characters', () => {
  const clause = 'The sleepy bear remembered the moonlit path, ';
  const text = `${clause.repeat(60)}and finally found the warm cabin.`;
  const segments = splitStoryIntoSegments(text);

  expect(segments.length).toBeGreaterThan(1);
  expect(segments.every((segment) => segment.length < 2000)).toBe(true);
  expect(segments.join(' ')).toBe(text);
});

it('hard-splits pathological text only below the streaming limit and always progresses', () => {
  const text = 'x'.repeat(5000);
  const segments = splitStoryIntoSegments(text);

  expect(segments.every((segment) => segment.length <= 1800)).toBe(true);
  expect(segments.join('')).toBe(text);
  expect(segments.every(Boolean)).toBe(true);
});
```

- [ ] **Step 3: Run the focused test and confirm it fails**

Run:

```bash
npx jest src/lib/__tests__/story-segments.test.ts --runInBand
```

Expected: FAIL because `splitStoryIntoSegments` does not exist.

- [ ] **Step 4: Implement the minimal pure splitter**

Export these constants and function:

```ts
export const MAX_STREAM_SEGMENT_CHARACTERS = 1800;
export const MAX_STREAM_CHARACTERS = 2000;

export function splitStoryIntoSegments(text: string): string[] {
  // Tokenize sentence-ending punctuation, group complete sentences, then use
  // clause punctuation before a bounded hard split for oversized sentences.
}
```

The implementation must retain the original sentence text, trim only inter-segment whitespace, choose the last valid boundary at or below 1,800 characters, and use a hard split at 1,800 characters only when no clause boundary exists. Throw a descriptive error for empty or whitespace-only input rather than returning an empty queue.

- [ ] **Step 5: Run the focused tests and typecheck**

Run:

```bash
npx jest src/lib/__tests__/story-segments.test.ts --runInBand
npm run typecheck
```

Expected: both commands exit `0`.

- [ ] **Step 6: Commit segmentation**

```bash
git add src/lib/story-segments.ts src/lib/__tests__/story-segments.test.ts
git commit -m "feat: add sentence-aware story segmentation"
```

## Task 3: Add the Authenticated Inworld JWT Edge Function

**Files:**
- Create: `supabase/functions/generate-inworld-token/index.ts`
- Create: `supabase/functions/generate-inworld-token/deno.json`
- Modify: `supabase/functions/deno.json`
- Create: `supabase/functions/tests/generate-inworld-token/index.test.ts`

- [ ] **Step 1: Write authentication-first and preflight tests**

```ts
import { assertEquals } from '@std/assert';
import { handleRequest } from '../../generate-inworld-token/index.ts';

function configureAuth() {
  Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
  Deno.env.set('SUPABASE_PUBLISHABLE_KEYS', 'test-anon-key');
}

Deno.test('returns 204 for OPTIONS', async () => {
  configureAuth();
  const response = await handleRequest(new Request('http://localhost', { method: 'OPTIONS' }));
  assertEquals(response.status, 204);
});

Deno.test('rejects requests without a Supabase authorization header', async () => {
  configureAuth();
  const response = await handleRequest(new Request('http://localhost', { method: 'POST' }));
  assertEquals(response.status, 401);
});

Deno.test('rejects fake Supabase tokens before reading Inworld configuration', async () => {
  configureAuth();
  Deno.env.delete('IN_WORLD_API_KEY');
  const response = await handleRequest(new Request('http://localhost', {
    method: 'POST',
    headers: { Authorization: 'Bearer fake-token' },
  }));
  assertEquals(response.status, 401);
});
```

- [ ] **Step 2: Add a pure signature test seam before upstream integration**

Export a narrowly scoped helper from the Edge Function module:

```ts
export function formatInworldDate(date: Date): string;
export function decodeInworldApiKey(value: string): { key: string; secret: string };
export async function createInworldAuthorization(params: {
  apiKey: { key: string; secret: string };
  now: Date;
  nonce: string;
  engineHost: string;
}): Promise<string>;
```

Use Web Crypto HMAC-SHA256 rather than adding a crypto dependency. The chained signature must match the sample algorithm exactly: start with `IW1${secret}`, HMAC each parameter in order, hex-encode each intermediate result, then HMAC `iw1_request` with the final intermediate value.

- [ ] **Step 3: Run the focused Deno tests and confirm they fail**

Run:

```bash
deno test supabase/functions/tests/generate-inworld-token/ --allow-all --no-check
```

Expected: FAIL because the function module and helpers do not exist.

- [ ] **Step 4: Implement the authenticated token exchange**

Use the repository wrapper:

```ts
import { withSupabase, type SupabaseContext } from '@supabase/server';

async function handler(req: Request, _ctx: SupabaseContext): Promise<Response> {
  // Read IN_WORLD_API_KEY only after withSupabase has authenticated the caller.
}

export const handleRequest = withSupabase({ auth: 'user' }, handler);

if (import.meta.main) Deno.serve(handleRequest);
```

The handler must decode `IN_WORLD_API_KEY`, sign the request for `api-engine.inworld.ai`, POST to `https://api.inworld.ai/auth/v1/tokens/token:generate` with `{ key, resources: [] }`, return only `{ token, expirationTime, type }`, and map malformed configuration to `500` and upstream non-2xx responses to `502`. Never include secrets or upstream response bodies in the client response.

- [ ] **Step 5: Add exact imports to both Deno configs**

The per-function config must include only production imports:

```json
{
  "compilerOptions": { "strict": true },
  "imports": { "@supabase/server": "npm:@supabase/server@^1" }
}
```

The top-level config must retain its existing imports and test task while adding no unnecessary package.

- [ ] **Step 6: Mock the upstream token endpoint and test success and failure**

Use `globalThis.fetch` replacement in the Deno test to assert the URL, `POST` method, JSON body, and `IW1-HMAC-SHA256` authorization prefix. Return a fake token response and assert that the handler returns only the approved token fields. Add a second test where fetch returns `503` and assert `502` with a generic error body.

- [ ] **Step 7: Run function tests and function typecheck**

Run:

```bash
deno test supabase/functions/tests/generate-inworld-token/ --allow-all --no-check
deno check supabase/functions/generate-inworld-token/index.ts
```

Expected: both commands exit `0`.

- [ ] **Step 8: Commit the token function**

```bash
git add supabase/functions/generate-inworld-token supabase/functions/deno.json supabase/functions/tests/generate-inworld-token
git commit -m "feat: add authenticated Inworld token function"
```

## Task 4: Replace Whole-Story Cache with Segment Cache

**Files:**
- Modify: `src/lib/audio-cache.ts`
- Modify: `src/lib/__tests__/audio-cache.test.ts`

- [ ] **Step 1: Define segment cache naming and API through failing tests**

Add tests for this API:

```ts
getCachedAudioSegmentPath(storyId: string, segmentIndex: number): Promise<string | null>
writeAudioSegmentToCache(storyId: string, segmentIndex: number, audio: Uint8Array): Promise<string>
getCachedAudioSegmentPaths(storyId: string, segmentCount: number): Promise<(string | null)[]>
```

Expected filenames are `audio_<storyId>_<segmentIndex>.mp3`. Test that byte data is encoded as base64 before writing, a missing file returns `null`, and a complete file returns its URI.

- [ ] **Step 2: Test story-level FIFO eviction with partial segment files**

Create files for seven stories with multiple segment indices and cover files. Assert that eviction identifies stories, not individual segment files, removes every segment for the two oldest stories, removes their covers, and leaves all segments for the five newest stories.

- [ ] **Step 3: Run focused cache tests and confirm they fail**

Run:

```bash
npx jest src/lib/__tests__/audio-cache.test.ts --runInBand
```

Expected: FAIL because segment cache functions and story grouping do not exist.

- [ ] **Step 4: Implement segment file operations with the current Expo File API**

Use `EncodingType.Base64` with a browser-safe byte-to-base64 conversion. Keep cover functions unchanged. Make `evictStory(storyId)` enumerate and delete every `audio_<storyId>_<index>.mp3` file plus the cover. Make FIFO eviction group audio files by story ID and compare the oldest `lastModified` value in each story group.

- [ ] **Step 5: Run cache tests and the existing utility tests**

Run:

```bash
npx jest src/lib/__tests__/audio-cache.test.ts src/lib/__tests__/audio-utils.test.ts --runInBand
```

Expected: cache tests pass. Existing utility tests may fail because the old whole-story API is intentionally being migrated in Task 5; do not preserve the old generated-audio fallback to make them pass.

- [ ] **Step 6: Commit the segment cache**

```bash
git add src/lib/audio-cache.ts src/lib/__tests__/audio-cache.test.ts
git commit -m "feat: cache story audio by segment"
```

## Task 5: Build the Client Inworld Streaming and Prefetch Service

**Files:**
- Create: `src/lib/inworld-tts.ts`
- Create: `src/lib/__tests__/inworld-tts.test.ts`
- Modify: `src/lib/audio-stream.ts`
- Modify: `src/lib/__tests__/audio-stream.test.ts`
- Modify: `src/lib/audio-utils.ts`
- Modify: `src/lib/__tests__/audio-utils.test.ts`

- [ ] **Step 1: Define the service contract in tests**

Use these types and behaviors:

```ts
export interface StoryAudioSegment {
  storyId: string;
  segmentIndex: number;
  text: string;
  uri: string;
}

export async function streamStorySegment(
  storyId: string,
  segmentIndex: number,
  text: string,
): Promise<StoryAudioSegment>;

export async function prefetchStoryAudio(
  storyId: string,
  storyText: string,
): Promise<void>;
```

Mock the JWT Edge Function response and mock `InworldTTS` so its `stream()` async generator yields multiple `Uint8Array` chunks. Assert one SDK stream call with `Ashley`, `inworld-tts-1.5-mini`, and `MP3`, one segment cache write containing the concatenated bytes, and no token request when the segment is cached.

- [ ] **Step 2: Test sequential prefetch and deduplication**

Provide three segment texts and assert that the second stream does not start until the first stream has resolved and that two simultaneous `prefetchStoryAudio` calls share one in-flight operation. Assert that a rejected segment stops later segment scheduling.

- [ ] **Step 3: Run focused tests and confirm they fail**

Run:

```bash
npx jest src/lib/__tests__/inworld-tts.test.ts src/lib/__tests__/audio-stream.test.ts src/lib/__tests__/audio-utils.test.ts --runInBand
```

Expected: FAIL because the client service and segment orchestration do not exist.

- [ ] **Step 4: Implement in-memory token acquisition and SDK construction**

Use `supabase.functions.invoke('generate-inworld-token')` after confirming the current user session. Keep the returned JWT only in module memory. Construct the SDK once per token lifecycle:

```ts
const tts = InworldTTS({
  token,
  onTokenExpiring: async () => (await getInworldToken()).token,
});
```

Do not read `IN_WORLD_API_KEY` in client code and do not write JWTs to AsyncStorage or file cache. If the SDK constructor or stream method requires an Expo-incompatible Node global, record the exact bundling failure and stop for guidance as required by the approved spec.

- [ ] **Step 5: Implement stream accumulation and cache integration**

For each segment, first call `getCachedAudioSegmentPath`. On a miss, iterate `for await (const chunk of tts.stream({ text, voice: 'Ashley', model: 'inworld-tts-1.5-mini', encoding: 'MP3' }))`, copy each `Uint8Array`, concatenate in order, write the complete bytes to cache, enforce FIFO eviction, and return the URI. Never expose incomplete bytes as a playable URI.

- [ ] **Step 6: Replace old `audio-stream` and `audio-utils` contracts**

Remove the fetch-to-Supabase proxy behavior and `getSampleAudioSource` generated-story fallback. Keep `getAmbientAudioSource`. Make `preFetchAudio` call the segment service with `splitStoryIntoSegments`, and expose cache-aware segment lookup for `PlayerContext`. Preserve in-flight deduplication by story ID and ensure rejected prefetches are removed from the map.

- [ ] **Step 7: Run client tests, lint, and typecheck**

Run:

```bash
npx jest src/lib/__tests__/inworld-tts.test.ts src/lib/__tests__/audio-stream.test.ts src/lib/__tests__/audio-utils.test.ts --runInBand
npm run lint
npm run typecheck
```

Expected: all commands exit `0`.

- [ ] **Step 8: Commit the client TTS service**

```bash
git add src/lib/inworld-tts.ts src/lib/__tests__/inworld-tts.test.ts src/lib/audio-stream.ts src/lib/__tests__/audio-stream.test.ts src/lib/audio-utils.ts src/lib/__tests__/audio-utils.test.ts
git commit -m "feat: stream story segments with Inworld TTS"
```

## Task 6: Integrate Ordered Progressive Playback

**Files:**
- Modify: `src/contexts/PlayerContext.tsx`
- Modify: `src/contexts/__tests__/PlayerContext.test.tsx`

- [ ] **Step 1: Extend player mocks and write failing segment lifecycle tests**

Replace the single `getAudioSource` mock with segment-service mocks. Add tests asserting:

```ts
it('starts the first segment when it is ready and streams later segments sequentially', async () => {
  // segment 0 resolves first; segment 1 must not be requested until segment 0 resolves
  // and the created player receives segment 0's URI.
});

it('buffers at a segment boundary until the next segment is ready', async () => {
  // didJustFinish on segment 0 sets isBuffering; resolving segment 1 creates and plays it.
});

it('ignores stale segment completions after switching stories', async () => {
  // resolve an old story's delayed segment after playStory(story2); story 1 must not play.
});
```

- [ ] **Step 2: Run focused player tests and confirm they fail**

Run:

```bash
npx jest src/contexts/__tests__/PlayerContext.test.tsx --runInBand
```

Expected: the new segment lifecycle tests fail against the current whole-file implementation.

- [ ] **Step 3: Add an active playback generation guard**

Create a monotonically increasing `playbackGenerationRef`. `playStory`, `stopStory`, `confirmAffirmation`, and cleanup increment or invalidate it. Every awaited segment operation captures the generation and checks it before creating a player, setting current story state, or changing post-story state.

- [ ] **Step 4: Implement the ordered segment coordinator inside `PlayerContext`**

Keep the existing public context API. Internally maintain:

```ts
type ActiveSegment = {
  index: number;
  uri: string;
};
```

On `playStory(story)`, split the story text, configure audio mode, set buffering, request segment zero through the client service, create the first `expo-audio` player, and then schedule exactly one later segment at a time. On `didJustFinish`, remove the finished listener/player, request or consume the next segment, and play it when ready. If the request is pending, leave `isBuffering` true and start playback only after the expected segment resolves.

- [ ] **Step 5: Preserve controls and post-story behavior**

Keep pause, resume, sleep mode, ambient audio, fade, pillow talk, affirmation, and completion behavior. `stopStory` must invalidate the generation and prevent old async work from changing state. `seekTo` must continue targeting the active `expo-audio` player; do not seek an ungenerated segment or issue an extra TTS request from a seek operation.

- [ ] **Step 6: Remove the sample fallback and surface generation failures**

If segment zero or a required later segment rejects, clear buffering, stop the active player, invalidate the queue, and expose the existing player error path/state rather than creating `getSampleAudioSource()`.

- [ ] **Step 7: Run player tests, lint, and typecheck**

Run:

```bash
npx jest src/contexts/__tests__/PlayerContext.test.tsx --runInBand
npm run lint
npm run typecheck
```

Expected: all commands exit `0`.

- [ ] **Step 8: Commit progressive playback**

```bash
git add src/contexts/PlayerContext.tsx src/contexts/__tests__/PlayerContext.test.tsx
git commit -m "feat: play story audio segments progressively"
```

## Task 7: Wire Sequential Background Prefetch and Retire the Proxy

**Files:**
- Modify: `src/app/(index,explore)/story.tsx`
- Delete: `supabase/functions/generate-story-audio/index.ts`
- Delete: `supabase/functions/generate-story-audio/deno.json`
- Delete: `supabase/functions/tests/generate-story-audio/index.test.ts`
- Modify: `supabase/functions/deno.json`
- Modify: `supabase/functions/tests/generate-inworld-token/index.test.ts`

- [ ] **Step 1: Update the story screen to start segment prefetch**

Keep the existing effect trigger on `story.id` and `story.story_text`, but call the new `prefetchStoryAudio(story.id, story.story_text)`. Swallow background prefetch errors as today; playback remains responsible for surfacing an actionable generation error. Do not add an Inworld API key to the screen or to Expo public environment variables.

- [ ] **Step 2: Add a story-screen regression test**

Update `src/app/__tests__/story.test.tsx` mocks to expose `prefetchStoryAudio`, render a loaded story, and assert it receives the story ID and text once. Assert the screen does not import or invoke the old proxy function.

- [ ] **Step 3: Remove the retired proxy and its obsolete tests**

Delete the MiMo `generate-story-audio` implementation, its per-function dependency config, and its auth/request tests only after all client imports and references are gone. Remove obsolete `generate-story-audio` imports from the top-level Deno config if no remaining function uses them.

- [ ] **Step 4: Search for stale runtime references**

Run:

```bash
rg "generate-story-audio|fetchStoryAudio|getAudioSource|getSampleAudioSource|MIMO_API_KEY|mimo-v2.5-tts" src supabase/functions package.json
```

Expected: no story-audio runtime reference remains. MiMo references used by the separate story-generation function are allowed only if they are unrelated to TTS proxying.

- [ ] **Step 5: Run the complete test suite and required checks**

Run:

```bash
npm run test:ci
npm run lint
npm run typecheck
npm run test:functions
deno check supabase/functions/generate-inworld-token/index.ts
```

Expected: every command exits `0`.

- [ ] **Step 6: Commit migration cleanup**

```bash
git add -- "src/app/(index,explore)/story.tsx" src/app/__tests__/story.test.tsx supabase/functions/generate-story-audio supabase/functions/deno.json supabase/functions/tests/generate-inworld-token
git commit -m "refactor: retire Supabase story audio proxy"
```

## Task 8: Verify Deployment Configuration and End-to-End Readiness

**Files:**
- No source changes unless a verification issue identifies a file in the approved allowlist.

- [ ] **Step 1: Discover current Supabase CLI commands before deployment work**

Run:

```bash
supabase --version
supabase functions --help
supabase secrets --help
```

Use only the flags shown by this installed CLI. Do not guess deployment or secret commands.

- [ ] **Step 2: Verify the server secret is configured without printing it**

Use the discovered secrets command to confirm `IN_WORLD_API_KEY` exists in the target project. Never print the value, place it in a tracked file, or expose it through an `EXPO_PUBLIC_*` variable.

- [ ] **Step 3: Deploy or invoke only after explicit environment confirmation**

If deployment is requested in the current environment, deploy `generate-inworld-token` using the discovered command and verify an authenticated invocation returns a JWT-shaped response containing `token`, `type`, and `expirationTime`, while an unauthenticated invocation returns `401`. Do not claim remote success without command output showing exit code `0`.

- [ ] **Step 4: Perform final local verification**

Run:

```bash
npm run lint
npm run typecheck
npm run test:ci
npm run test:functions
deno check supabase/functions/generate-inworld-token/index.ts
git status --short
git diff HEAD~1..HEAD --stat
```

Expected: all checks pass, the final diff contains only the approved implementation files and plan/spec commits, and no secret values appear in the diff.

- [ ] **Step 5: Commit any final approved verification-only documentation changes**

Only if a tracked documentation correction is needed and it is explicitly approved, use a conventional commit such as:

```bash
git add docs/superpowers/specs/2026-07-31-inworld-tts-streaming-design.md docs/superpowers/plans/2026-07-31-inworld-tts-streaming-plan.md
git commit -m "docs: finalize Inworld TTS implementation notes"
```

## Plan Self-Review

- Spec coverage: JWT function, client SDK, Ashley voice, `inworld-tts-1.5-mini`, MP3, 1,800-character sentence-aware segmentation, clause fallback, sequential prefetch, segment cache, five-story eviction, progressive playback, buffering, stale guards, cancellation semantics, no sample fallback, tests, lint, typecheck, and SDK compatibility verification each have an explicit task.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation requirement is used. Commands, file paths, function names, cache names, and expected outcomes are explicit.
- Type consistency: `splitStoryIntoSegments`, `streamStorySegment`, `prefetchStoryAudio`, `getCachedAudioSegmentPath`, `writeAudioSegmentToCache`, and `getCachedAudioSegmentPaths` are defined once and reused consistently.
- Scope check: the subsystems are coupled by the approved streaming lifecycle, so they remain one implementation plan with independently testable tasks and commits.
- Security check: the API key remains server-only; JWTs remain memory-only; no credentials are added to tracked files or Expo public environment variables.

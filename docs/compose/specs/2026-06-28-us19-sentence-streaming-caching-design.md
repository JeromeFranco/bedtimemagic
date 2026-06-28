# US-1.9: Background Audio — Sentence-Level Streaming & Caching Design

**Date:** 2026-06-28
**Status:** Draft
**User Story:** US-1.9 from `docs/user-stories.md`

---

## [S1] Problem

US-1.9 requires sentence-level TTS streaming from the server and local audio caching on the client. Currently:

- `audio-utils.ts` returns a bundled sample MP3 for all stories (stub)
- No TTS edge function exists (`supabase/functions/` is empty)
- No `expo-file-system` installed — no local file caching
- No FIFO eviction for cache management

The PRD mandates: audio chunks streamed per-sentence, written to `cacheDir` as `audio_[story_id].mp3`, cache-first playback with network fallback, and FIFO eviction (max 5 stories, ~15-25MB footprint).

## [S2] Server Architecture — `generate-story-audio` Edge Function

**Endpoint:** `supabase/functions/generate-story-audio/index.ts`

**Input:** `{ story_text: string }` (POST body)

### Flow

1. Split story text into sentences via regex (`/[.!?]+\s+/g`)
2. Generate TTS for all sentences **concurrently** using MiMo V2.5 TTS
3. Concatenate all audio `Uint8Array` buffers into a single MP3
4. Stream the complete audio back via SSE in base64 chunks (~32KB per chunk)

### SSE Event Format

```
event: chunk
data: {"index":0,"total":12,"audio":"base64data..."}

event: done
data: {"total_chunks":12,"total_bytes":9437184}

event: error
data: {"message":"TTS failed for sentence 3","sentence_index":3}
```

### TTS API Call (Deno fetch)

- `POST https://api.xiaomimimo.com/v1/audio/speech`
- Headers: `api-key: $MIMO_API_KEY`, `Content-Type: application/json`
- Body: `{ model: "mimo-v2.5-tts", voice: "Chloe", input: sentence, response_format: "mp3" }`
- Context parameter: "gentle bedtime story narration, warm and soothing, slow pace"

### Concurrency

All sentences are TTS'd in parallel via `Promise.all()`, then streamed sequentially (preserving story order). This maximizes throughput — a 10-minute story (~50 sentences) completes TTS in the time of a single request.

### Error Handling

- If any sentence TTS fails, return an SSE `error` event with the failing sentence index
- Client receives the error and can retry or fall back to sample audio
- Edge function validates `story_text` is non-empty and within reasonable length (~5000 words max)

## [S3] Client — Audio Cache Manager

**New dependency:** `expo-file-system`

**Location:** `src/lib/audio-cache.ts`

### Interface

```typescript
getCachedAudioPath(storyId: string): Promise<string | null>
writeAudioToCache(storyId: string, audioBase64: string): Promise<void>
evictStory(storyId: string): Promise<void>
enforceEviction(): Promise<void>
getCacheSize(): Promise<number>
```

### Cache Path Convention

`${FileSystem.cacheDirectory}audio_[story_id].mp3`

### Cover Image Eviction

When audio is evicted, corresponding cover image (if cached locally) is also deleted — per PRD "complete story bundle wrapper."

### FIFO Policy

`enforceEviction()` is called after each new audio file is written:

1. List all `audio_*.mp3` files in `cacheDirectory`
2. Sort by last modified timestamp (oldest first)
3. If count > 5, delete oldest files until count = 5
4. Also delete corresponding cover images for evicted stories

This keeps storage at ~15-25MB (5 stories × 3-5MB each).

## [S4] Client — SSE Audio Streaming Client

**Location:** `src/lib/audio-stream.ts`

### Interface

```typescript
streamStoryAudio(storyId: string, storyText: string): Promise<string>
// Returns: local file path of the cached audio
```

### Implementation

1. Use `fetch()` directly (not `supabase.functions.invoke()`) to call the edge function URL with proper auth headers
2. Parse SSE events from the response body stream using a `ReadableStream` reader
3. For each `chunk` event: decode base64 → append to local file via `audio-cache.writeAudioToCache()`
4. On `done` event: call `audio-cache.enforceEviction()`, return the cached file path
5. On `error` event: throw with error details

### Auth

The edge function URL is constructed as `${supabaseUrl}/functions/v1/generate-story-audio`. Auth uses the Supabase anon key in the `Authorization: Bearer <anon_key>` header (same pattern as `supabase.functions.invoke()`). The edge function itself does not require user-level auth — it only needs the story text.

### Context Parameter for TTS

The `context` parameter passed to MiMo TTS controls narration style. For bedtime stories: `"gentle bedtime story narration, warm and soothing, slow pace"`. This ensures consistent calm tone across all sentence chunks.

## [S5] Client — Playback Integration

### Modified: `src/lib/audio-utils.ts`

`getAudioSource(story)` becomes the smart routing point:

```typescript
export async function getAudioSource(story: Story): Promise<{ uri: string }> {
  // 1. Check local cache first
  const cachedPath = await getCachedAudioPath(story.id);
  if (cachedPath) {
    return { uri: cachedPath };
  }

  // 2. Cache miss → stream from server, cache as we go
  const localPath = await streamStoryAudio(story.id, story.story_text);
  return { uri: localPath };
}
```

**Key change:** `getAudioSource` becomes `async` (returns `Promise`). PlayerContext must `await` it.

### Modified: `src/contexts/PlayerContext.tsx`

`playStory` changes:
- `getAudioSource(story)` is now awaited
- While waiting (network fetch), `isBuffering` is `true` — player screen shows loading state
- Once resolved, creates `AudioPlayer` from the local URI
- Cached replays: `isBuffering` is briefly `true` then immediately `false` (local file read is near-instant)

### Modified: `src/api/stories.ts`

Add new exported function for the SSE streaming call. This is the bridge between the Supabase client and the raw `fetch` needed for SSE.

## [S6] File Structure

### New Files

| File | Purpose |
|------|---------|
| `supabase/functions/generate-story-audio/index.ts` | TTS streaming edge function |
| `src/lib/audio-cache.ts` | Local cache manager (FIFO, read/write/evict) |
| `src/lib/audio-stream.ts` | SSE client for streaming audio from edge function |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/audio-utils.ts` | `getAudioSource()` → async, cache-first + stream fallback |
| `src/contexts/PlayerContext.tsx` | `playStory()` awaits async `getAudioSource()` |
| `package.json` | Add `expo-file-system` |

### New Dependency

`expo-file-system` — for `cacheDirectory`, `writeAsStringAsync`, `getInfoAsync`, `deleteAsync`, `readDirectoryAsync`

## [S7] Scope & Out of Scope

### In Scope
- Edge function for sentence-level TTS generation and SSE streaming
- Client-side SSE streaming client
- Local audio cache with FIFO eviction
- Cache-first playback with network fallback
- Integration into existing PlayerContext

### Out of Scope
- Cover image caching/eviction (US-1.5 spec mentions this but no cover image download logic exists yet)
- Optimistic pre-fetching of first 2 sentences (PRD 4.2 — future optimization)
- Offline playback guarantee (cache helps but is not guaranteed)
- TTS voice selection UI (fixed to "Chloe" for now)
- Progress indicator for streaming download (future enhancement)

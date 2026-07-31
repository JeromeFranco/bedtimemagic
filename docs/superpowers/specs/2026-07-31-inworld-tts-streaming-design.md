# Inworld TTS Streaming Design

## Goal

Replace the current Supabase-proxied MiMo story-audio generation path with client-side Inworld TTS streaming using `inworld-tts-1.5-mini`. The client will receive a short-lived Inworld JWT from an authenticated Supabase Edge Function, stream narration directly from Inworld, begin playback as soon as the first bounded segment is complete, and cache completed segments locally for replay.

## Approved Decisions

- Use the official `@inworld/tts` SDK in the Expo client.
- Use one fixed narrator voice: `Ashley`.
- Use model `inworld-tts-1.5-mini`.
- Use MP3 output.
- Treat progressive playback as segment-level playback. `expo-audio` receives completed segment file URIs rather than raw byte chunks.
- Keep local audio caching and sequential background prefetch.
- Cache each segment separately instead of assembling one whole-story file.
- Do not persist Inworld JWTs. Keep tokens in memory and refresh through the SDK callback.
- Require an authenticated Supabase session to mint an Inworld JWT.
- On stop, story switch, or unmount, stop playback, prevent future segment scheduling, discard unplayed generated output, and best-effort stop active SDK streams.
- Do not use the sample story as a TTS failure fallback.

## Segmenting

The client will split story text into ordered, sentence-aware segments. A segment should be no larger than 1,800 characters, leaving safety margin below Inworld's 2,000-character limit for `stream()`.

Segments should end at complete sentence boundaries. Consecutive complete sentences are grouped until adding another sentence would exceed the cap. Sentence parsing must preserve the original text content and punctuation sent to TTS.

If one sentence exceeds 1,800 characters, split it at the nearest clause boundary, preferring punctuation such as commas, semicolons, colons, em dashes, and similar natural pauses. A hard character split is allowed only as a last resort and must remain below the Inworld 2,000-character limit. The splitter must always make progress and must not emit empty segments.

## Architecture

### JWT Edge Function

Add an authenticated `generate-inworld-token` Supabase Edge Function using the repository's `withSupabase({ auth: "user" })` pattern.

The function will:

1. Read the server-only `IN_WORLD_API_KEY` secret.
2. Decode the Base64 credential into the Inworld API key and secret.
3. Generate the documented `IW1-HMAC-SHA256` authorization signature using the current timestamp, Inworld engine host, token-generation method, and cryptographic nonce.
4. POST to `https://api.inworld.ai/auth/v1/tokens/token:generate` with the API key and an empty resources list.
5. Return the JWT and expiration metadata required by the client.

The function must never return the API key, decoded secret, HMAC signature, or other credential material. Missing or malformed configuration and upstream failures must produce controlled error responses without credential details.

The existing `generate-story-audio` proxy and its MiMo TTS implementation are no longer part of the story-audio runtime path and should be removed or retired as part of implementation once all consumers and tests are migrated.

### Client TTS Service

Create a client-side service around `@inworld/tts` that obtains a token from the JWT Edge Function and constructs an `InworldTTS` client with:

- `token`: the in-memory JWT
- `onTokenExpiring`: a callback that obtains a fresh JWT from Supabase
- `model`: `inworld-tts-1.5-mini` per stream request
- `voice`: `Ashley`
- `encoding`: `MP3`

The service will expose ordered segment streaming and cache integration without leaking SDK details into screen components or the player UI.

### Progressive Playback

The playback pipeline will maintain an ordered segment queue for the active story.

1. Check the segment cache.
2. For a cache miss, stream the next segment sequentially through Inworld.
3. Accumulate the segment's `Uint8Array` chunks.
4. Write the complete segment MP3 to its local cache file.
5. Start playback when segment one is available.
6. Continue requesting the next segment in order while the current segment plays, without concurrent TTS requests.
7. At a segment boundary, play the next completed segment.
8. If the next segment is not ready, pause and expose buffering state; resume when it becomes available.
9. After the final segment finishes, retain the existing post-story fade, pillow-talk, affirmation, and completion behavior.

The player must reject stale completions using an active story/request identity so a stopped story cannot attach audio to a later story.

### Background Prefetch

The story card continues to initiate sequential background prefetch. It will use the same segment service and cache, so the player can immediately consume any segment already generated. Prefetch must not issue concurrent segment requests and must stop scheduling later segments after cancellation or story replacement.

### Local Cache

Replace the current whole-story audio cache contract with segment-aware cache entries. Each entry must be keyed by story ID and segment index, use MP3 storage, and preserve segment ordering. Cache lookup must distinguish a complete segment from a missing or incomplete file.

The existing five-story FIFO policy remains the capacity policy. Eviction must remove all segment files belonging to an evicted story, and must not leave orphaned segment files. Replays of fully or partially cached stories must avoid regenerating cached segments.

## Error and Cancellation Behavior

- Missing or expired Supabase auth: fail token acquisition and surface a playback-generation error.
- Missing or malformed Inworld configuration: return a server configuration error without exposing credentials.
- Inworld token endpoint failure: return a controlled upstream error and do not retry indefinitely.
- TTS stream failure: stop the affected playback pipeline and show an error; never use the unrelated sample story.
- Segment cache write failure: treat the segment as unavailable and fail playback rather than playing an incomplete MP3.
- Stop, story switch, or unmount: stop playback immediately, prevent future scheduling, discard unplayed generated output, and best-effort terminate the active SDK iterator. SDK documentation does not specify `AbortSignal` support, so transport cancellation and billing cancellation are not guaranteed for an already-active request.
- Segment boundary underrun: pause playback, set buffering state, and resume when the expected segment is complete.
- Cached replay: do not mint a token or call Inworld when all required segments are cached.

## Testing and Verification

Add or update tests for:

- Sentence grouping under the 1,800-character cap.
- Complete sentence endings and oversized-sentence clause fallback.
- No empty segments and guaranteed progress for pathological input.
- JWT signature construction and token-function request/response handling with mocked upstream calls.
- Authentication-first behavior of the JWT Edge Function.
- Inworld stream chunk accumulation and per-segment cache writes.
- Cache hits, cache misses, partial stories, and five-story eviction without orphaned segments.
- Sequential prefetch and playback scheduling.
- Stale request suppression after stop or story replacement.
- Buffering and resume at segment boundaries.
- Removal of the sample-audio fallback from generated-story playback.

Run the repository-required verification after implementation:

- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run test:functions`
- `npm run typecheck:functions` updated for the replacement token function

The SDK must also be verified for Expo/React Native bundling and runtime compatibility. If the official SDK cannot bundle or stream correctly in this Expo application, stop and report that blocker rather than silently switching to direct REST calls.

## Out of Scope

- Dynamic voice selection or voice-per-protagonist configuration.
- Persisting JWTs on-device.
- Cloud audio storage.
- Byte-level native audio playback.
- Concurrent generation of all story segments.
- Guaranteed cancellation or refund of an already-active Inworld request.

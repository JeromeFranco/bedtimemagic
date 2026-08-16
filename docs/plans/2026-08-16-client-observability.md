# Client Observability Implementation Plan

**Goal:** Add privacy-safe development-only structured diagnostics that correlate the three client Edge Function calls with server execution and reconstruct the Inworld TTS lifecycle without changing application behavior.

**Design:** `docs/specs/2026-08-16-client-observability-design.md`

**Confidence:** High. The repository has exactly the three approved `supabase.functions.invoke` call sites, the installed Supabase client exposes invocation headers, signals, response status, and the documented HTTP/relay/fetch error classes, and the current TTS module contains the cache, token, deduplication, retry, cancellation, finalization, and prefetch boundaries required by the design. The Edge Functions already use `withSupabase`, whose supported CORS path can be regression-tested with the added header.

**Constraints:**

- Emit diagnostics only when `__DEV__` is true. Do not add a runtime toggle, environment variable, monitoring SDK, native dependency, persistent sink, remote transport, UI, or database change.
- Treat event payloads as closed schemas. No caller may pass arbitrary context, domain objects, raw errors, request/response bodies, tokens, generated content, identifiers, text, paths, URIs, or audio bytes.
- Logging and timing failures must be swallowed and must never alter request, retry, cache, cancellation, cleanup, playback, or error propagation behavior.
- Use opaque locally unique operation IDs built from supported JavaScript runtime primitives and module-local entropy/counter state; never derive them from child, user, story, prompt, token, file, or device data.
- Preserve existing API contracts: story and cover functions still resolve their current result types or throw the original Supabase error; TTS functions keep their current arguments, return values, rejection behavior, retry count, and best-effort cancellation semantics.
- Do not claim that an aborted Supabase invocation stopped server work or that `cancelStoryAudio` aborted the Inworld HTTP request.
- Follow React Compiler conventions if `PlayerContext` changes: no unnecessary `useMemo`, and `useCallback` only where the existing effect/listener identity requires it. Do not add lint or TypeScript suppressions.
- After every implementation task that changes code, run `npm run lint` and `npm run typecheck` and fix all errors before continuing. Do not make paid live provider calls without explicit approval.

### Task 1: Establish the typed, fail-safe client event boundary

**Outcome:** All client diagnostics use one development-gated logger that constructs a one-line JSON envelope from allowlisted primitive fields and cannot affect observed application behavior.

**Files / symbols**

- Create: `src/lib/observability.ts` — `ObservabilityEventMap`, `ObservabilityEventName`, `ObservabilityErrorKind`, `createOperationId`, `startDuration`, `emitObservabilityEvent`, `categorizeError`
- Create: `src/lib/__tests__/observability.test.ts`

**Implementation**

1. Write the logger tests first. Exercise the real public logger API with controlled console spies and fake timers/clock values; reset mocks after each test so the suite does not leak console state.
2. Define the event-name-to-payload map as the single source of truth for all approved client events:

   - `supabase.function.started|succeeded|failed|cancelled`
   - `tts.prefetch.started|succeeded|failed|cancelled`
   - `tts.token.cache_hit|refresh_started|refresh_succeeded|refresh_failed`
   - `tts.segment.cache_hit|deduplicated|started|retrying|succeeded|failed|cancelled`

   The common envelope owns `timestamp`, `level`, `event`, `operationId`, optional `parentOperationId`, and optional terminal `durationMs`. Event payload types expose only the design-approved primitives: the three-name `functionName` union, segment index/count, attempt, finalized byte count, safe status, cache state, and `errorKind`.
3. Keep level selection inside the logger with a fixed event-to-level table: lifecycle starts/cache hits/deduplication use `debug` or `info`, retries and cancellations use `warn`, failures use `error`, and successes use `info`. Call sites provide an event and payload, never a console method or prose message.
4. Pair compile-time payload types with a runtime allowlist per event. Construct a fresh record by copying only the envelope and keys registered for that event; discard unknown keys from JavaScript callers or unsafe casts before serialization. Accept only strings, finite numbers, and booleans; normalize durations with `Math.max(0, Math.round(value))` and omit non-finite values.
5. Generate IDs without accepting domain input. Use a module-local counter plus `Date.now()` and `Math.random()` output encoded into a bounded `[A-Za-z0-9_-]` identifier of at most 64 characters. Consumers treat the result as opaque and never parse its components.
6. Make `startDuration()` return a closure that computes a rounded non-negative elapsed duration from `Date.now()`. If either read or subtraction fails, return `undefined` so the terminal event omits duration.
7. Keep error handling closed and non-recursive. `categorizeError` may use only supported `instanceof` checks for Supabase `FunctionsHttpError`, `FunctionsRelayError`, and `FunctionsFetchError`, the Inworld `ApiError`/`NetworkError` classes, `CancelledError` by a supplied safe discriminator, and a supplied pipeline stage. Return only an allowlisted `errorKind` and an optional finite numeric HTTP status; never read an HTTP body, stringify the error, copy its message/stack/context, or enumerate it.
8. In `emitObservabilityEvent`, return immediately outside `__DEV__`. Serialize the newly constructed primitive record exactly once and dispatch that one string to `console.debug|info|warn|error`. Wrap construction, serialization, and sink invocation in a no-throw boundary; if the chosen sink throws, swallow it without recursively logging another observability event.

**Verify**

- `npm run test:ci -- --runInBand src/lib/__tests__/observability.test.ts`
- Confirm tests cover one-line valid JSON, timestamp/envelope construction, stable levels, opaque bounded IDs, duration normalization/omission, disabled logging, a throwing console sink, unknown-key removal, non-primitive removal, and sanitization of every supported error category without exposing sentinel message/body/token/path values.
- `npm run lint`
- `npm run typecheck`

### Task 2: Centralize and migrate the three client Edge Function invocations

**Outcome:** Story, cover, and Inworld-token requests emit one correlated client lifecycle, preserve all invocation options, and retain their existing success and error contracts.

**Files / symbols**

- Create: `src/lib/invoke-edge-function.ts` — `InstrumentedFunctionName`, `InstrumentedFunctionResultMap`, `invokeEdgeFunction`
- Create: `src/lib/__tests__/invoke-edge-function.test.ts`
- Modify: `src/api/stories.ts` — `generateStory`, `generateCoverImage`
- Modify: `src/api/__tests__/stories.test.ts`
- Modify: `src/lib/inworld-tts.ts` — `getInworldToken`
- Modify: `src/lib/__tests__/inworld-tts.test.ts`

**Dependencies:** Task 1 logger and sanitizer.

**Implementation**

1. Start with wrapper tests using the real installed Supabase error classes and a mocked `supabase.functions.invoke`. Cover resolved failures as well as an unexpected rejected invocation promise.
2. Define a closed function/result map:

   ```ts
   type InstrumentedFunctionResultMap = {
     'generate-story': Story;
     'generate-cover-image': { coverImageUrl: string };
     'generate-inworld-token': {
       token: string;
       expirationTime?: string;
       type?: string;
     };
   };

   async function invokeEdgeFunction<Name extends keyof InstrumentedFunctionResultMap>(
     functionName: Name,
     options?: FunctionInvokeOptions,
   ): Promise<InstrumentedFunctionResultMap[Name]>;
   ```

3. For each invocation, create one operation ID and duration closure, emit `supabase.function.started`, then call `supabase.functions.invoke` with every original option preserved. Copy caller headers into a new object, remove any case-insensitive collision with the reserved `x-client-operation-id` name, and set the generated header; do not mutate the caller's options or headers.
4. After settlement, classify in this order:

   - if the supplied signal is aborted, emit `supabase.function.cancelled` regardless of whether the best-effort request settled with data or error, then preserve that settlement for the caller;
   - on data with no error, emit `succeeded` and return the same data reference;
   - on a returned or thrown error, emit `failed` with the safe category and `response?.status` when finite, then throw that exact error object.

   Use one guarded terminal-emission helper so every started invocation emits exactly one terminal record even when the invocation promise rejects unexpectedly. A logging failure must not replace a successful value or the original failure.
5. Migrate `generateStory` and `generateCoverImage` to the wrapper and remove their now-redundant `{ data, error }` handling. Preserve authentication checks, request bodies, optional `AbortSignal`, return types, and caller-visible error identity.
6. Migrate token issuance inside `getInworldToken` to the same wrapper. Keep the existing session check, token validation, expiration fallback, promise deduplication, cache mutation, and original generic error for a successful response that lacks `data.token`.
7. Update existing story and TTS tests to mock `invokeEdgeFunction` at the new boundary where appropriate. Retain request-body/signal assertions and add explicit migration assertions for all three allowlisted names so a direct `supabase.functions.invoke` cannot silently return to these APIs.

**Verify**

- `npm run test:ci -- --runInBand src/lib/__tests__/invoke-edge-function.test.ts src/api/__tests__/stories.test.ts src/lib/__tests__/inworld-tts.test.ts`
- Confirm wrapper tests cover start/success ID correlation, duration, HTTP/relay/fetch/unknown classification, safe status extraction without body consumption, pre-set and mid-flight abort, exactly one terminal event, body/signal/method/timeout preservation, caller-header preservation, reserved-header replacement, original data identity, and original error identity.
- `rg -n "supabase\.functions\.invoke" src` returns only the implementation in `src/lib/invoke-edge-function.ts` and intentional test mocks/assertions.
- `npm run lint`
- `npm run typecheck`

### Task 3: Add privacy-safe Edge Function lifecycle correlation

**Outcome:** Every authenticated execution of the three functions logs a safe start and exactly one terminal server event carrying the validated client operation ID, while CORS, auth, responses, and thrown errors remain unchanged.

**Files / symbols**

- Create: `supabase/functions/_shared/observability.ts` — `EdgeFunctionName`, `readClientOperationId`, `withEdgeFunctionObservability`
- Create: `supabase/functions/tests/observability/index.test.ts`
- Modify: `supabase/functions/generate-story/index.ts` — wrap the authenticated handler and remove raw error logging
- Modify: `supabase/functions/generate-cover-image/index.ts` — wrap the authenticated handler and remove raw error logging
- Modify: `supabase/functions/generate-inworld-token/index.ts` — wrap the authenticated handler
- Modify: `supabase/functions/tests/generate-story/index.test.ts`
- Modify: `supabase/functions/tests/generate-cover-image/index.test.ts`
- Modify: `supabase/functions/tests/generate-inworld-token/index.test.ts`
- Modify: `package.json` — make `typecheck:functions` check all three function entrypoints

**Dependencies:** Task 2's reserved header name and ID format.

**Implementation**

1. Write shared-helper Deno tests first. Stub console methods only within each test and restore them in `finally` blocks.
2. `readClientOperationId(req)` accepts only `/^[A-Za-z0-9_-]{8,64}$/`. Return the fixed neutral value `missing` for an absent, empty, oversized, or malformed header and never echo the rejected value.
3. `withEdgeFunctionObservability(functionName, handler)` wraps the inner authenticated handler passed to `withSupabase`, not the outer `withSupabase` result. This keeps automatic OPTIONS/auth behavior outside custom lifecycle logging: a request rejected before function code executes is represented by the client's HTTP/relay event, while an authenticated handler execution receives one server lifecycle.
4. At entry, emit one-line JSON `edge.function.started` with the validated/neutral `operationId`, fixed `functionName`, UTC timestamp, and level. Await the original handler exactly once:

   - for a returned 2xx response, emit `edge.function.succeeded` with status and duration;
   - for a returned non-2xx response, emit `edge.function.failed` with status, duration, and `errorKind: 'client'` for 4xx or `'server'` for 5xx;
   - for a thrown value, emit one failed terminal with `errorKind: 'thrown'`, then rethrow the exact value.

   Construct records from fixed primitive fields only. Guard timing, serialization, and console dispatch so logging cannot change the response or thrown value.
5. Compose each export as `withSupabase({ auth: 'user' }, withEdgeFunctionObservability('<name>', handler))`. Preserve the existing exported test seams (`handler` where already public and `handleRequest`) and all current response bodies/statuses.
6. Remove free-form `console.error` calls that currently print MiMo/OpenAI, AI Gateway, storage, or database errors. The safe failed terminal replaces those raw objects/messages; do not add intermediate prose logs or serialize upstream exceptions. Keep safe client response behavior unchanged, including current response messages where the design does not request an API change.
7. Add correlation assertions to each function suite using direct calls to the inner observed handler with the existing mocked context/fetch dependencies where available. Verify valid, missing, and malicious headers; success and representative handled failure statuses; thrown passthrough; one terminal event; and absence of request-body, generated-content, token, API-key, raw-error, and malicious-header sentinels.
8. Extend each OPTIONS test to assert the supported `withSupabase` CORS response allows `x-client-operation-id` in `Access-Control-Allow-Headers`. If the installed wrapper does not include it, use the framework-supported `@supabase/server` CORS configuration/API documented for the installed version; do not replace `withSupabase` with a hand-rolled preflight or patch response headers after the fact.
9. Expand `typecheck:functions` to pass the three entrypoints to `deno check` under the shared `supabase/functions/deno.json`, ensuring the shared helper is checked through every composition.

**Verify**

- `deno test --no-check --allow-env --allow-sys --config supabase/functions/deno.json supabase/functions/tests/observability/index.test.ts supabase/functions/tests/generate-story/index.test.ts supabase/functions/tests/generate-cover-image/index.test.ts supabase/functions/tests/generate-inworld-token/index.test.ts`
- `npm run typecheck:functions`
- Confirm the tests prove that malformed header text and raw upstream error sentinels never appear in captured log strings, and that handler response identity/status/body and thrown error identity remain unchanged.
- `npm run lint`
- `npm run typecheck`

### Task 4: Instrument the complete TTS token, segment, and prefetch lifecycle

**Outcome:** A developer can reconstruct prefetch and foreground playback work across cache, token refresh, deduplication, retry, finalization, failure, and cancellation without exposing story or device data.

**Files / symbols**

- Modify: `src/lib/inworld-tts.ts` — token state, `getInworldToken`, in-flight maps, `streamStorySegment`, `prefetchStoryAudio`
- Modify: `src/lib/audio-cache.ts` — `AudioSegmentWriter.bytesWritten`
- Modify: `src/lib/__tests__/inworld-tts.test.ts`
- Modify: `src/lib/__tests__/audio-cache.test.ts`
- Modify: `src/lib/audio-stream.ts` — `getSegmentAudioSources`
- Modify: `src/lib/__tests__/audio-stream.test.ts`
- Modify: `src/contexts/PlayerContext.tsx` — playback-scoped TTS parent operation ID
- Modify: `src/contexts/__tests__/PlayerContext.test.tsx`

**Dependencies:** Tasks 1 and 2.

**Implementation**

1. Expand the TTS tests before production changes. Capture typed emitted events rather than parsing console prose, use deferred generators for deduplication/cancellation ordering, and assert only event names, safe metadata, correlation, and relative order—not exact IDs, timestamps, or durations.
2. Add an internal optional context to `streamStorySegment` without changing existing callers' required arguments or result:

   ```ts
   type TtsSegmentContext = {
     parentOperationId?: string;
     segmentCount?: number;
   };
   ```

   A prefetch passes its own operation ID and segment count. `getSegmentAudioSources` creates one parent ID per call and passes it to every cache miss. `PlayerProvider.playStory` creates one parent ID per playback generation, stores it in a ref, passes it to the first and subsequent segment requests, and replaces/clears it with the existing playback generation/reset lifecycle. The parent is diagnostic state only and must never participate in stale-generation or cancellation decisions.
3. Change `inflightSegments` values from a bare promise to `{ promise, operationId }`. On an audio cache hit emit only `tts.segment.cache_hit`; do not emit a false stream start. When work already exists, emit `tts.segment.deduplicated` using the active segment's operation ID and return the exact existing promise without creating a second start/terminal lifecycle.
4. For cache-miss owner work, create one segment operation, emit `tts.segment.started` before token acquisition, and centralize terminal emission behind a one-shot guard:

   - emit `retrying` only when entering the app-owned second attempt, with `attempt: 2` and the categorized first-attempt failure;
   - never claim visibility into the SDK's internal request-start retries;
   - after `writer.finish()` and FIFO eviction preserve their current order, emit `succeeded` with the successful attempt, duration, segment index/count, and finalized byte count;
   - emit `cancelled` for `CancelledError` and `failed` for the final non-cancellation error, then rethrow the same caller-visible error as today.

   Keep `activeStreams` removal, partial-file aborts, late-chunk handling, and `inflightSegments` cleanup in their existing `finally` boundaries.
5. Give `AudioSegmentWriter` a read-only `bytesWritten` accessor backed by an internal counter. Increment by incoming chunk byte length, reset it in `abort()` before each retry/cancellation, and retain the final successful count after `finish()` so success logging does not inspect the file URI/path or audio contents. Test multi-chunk totals and retry reset behavior.
6. Pass the owning segment's parent ID into `getInworldToken(parentOperationId?)`. On a valid cached token emit `tts.token.cache_hit` without expiry/token metadata. Store in-flight refresh state as `{ promise, operationId }`; only the creator emits `refresh_started` and exactly one `refresh_succeeded` or `refresh_failed`, while concurrent waiters reuse the promise silently. Preserve the existing double cache check, session requirement, expiry calculation, singleton client, `onTokenExpiring` refresh, and `finally` cleanup.
7. Make one prefetch operation ID the parent for its segments. Emit `tts.prefetch.started` after splitting with `segmentCount`, then exactly one terminal:

   - `succeeded` after all segments finish;
   - `failed` when a segment rejects for a non-cancellation reason, followed by the same rejection;
   - `cancelled` when an in-flight segment rejects with `CancelledError`, or when the cancel counter changes between segments. Preserve the current between-segment cancellation behavior that resolves rather than introducing a new rejection.

   A duplicate `prefetchStoryAudio` call continues returning the existing promise without creating a second prefetch lifecycle.
8. Use safe stage-aware categories only: Supabase sanitizer output for token issuance, `auth` for the existing missing-session/token validation conditions, Inworld `NetworkError` as `network`, Inworld `ApiError`/other supported provider errors as `provider`, finalization/eviction failures as `cache`, `CancelledError` as cancellation, and `unknown` otherwise. Do not log error names/messages, segment/story text or length, story ID, token/expiry, request parameters, cache paths, or file names.
9. Update `PlayerContext` and audio-stream tests to assert one stable parent ID is forwarded across a foreground run and a new ID is used for a later run. Retain all existing stale-generation, buffering, playlist, cancellation, and public-context assertions.

**Verify**

- `npm run test:ci -- --runInBand src/lib/__tests__/observability.test.ts src/lib/__tests__/inworld-tts.test.ts src/lib/__tests__/audio-cache.test.ts src/lib/__tests__/audio-stream.test.ts src/contexts/__tests__/PlayerContext.test.tsx`
- Confirm coverage includes token hit/refresh success/failure/deduplication, segment cache hit, active-operation deduplication, app-owned retry then success/failure, successful finalized byte count, cancellation before/during stream, late settlement and cleanup, prefetch success/failure/between-segment cancellation, and foreground parent correlation.
- Add sentinel privacy assertions proving serialized TTS output omits story ID/text, token/expiry, stream request values, cache URI/path, raw audio, and raw error details.
- `npm run lint`
- `npm run typecheck`

### Task 5: Run full regression and connected-development validation

**Outcome:** Automated and manual evidence confirms that structured diagnostics are useful, correlated, private, development-only, and behavior-preserving.

**Files / symbols**

- Modify only if a real regression is found: implementation or test files from Tasks 1-4; do not broaden scope or suppress failures.

**Dependencies:** Tasks 1-4 complete.

**Implementation**

1. Run the full client and Edge Function suites plus both typecheck paths. Fix only regressions attributable to this implementation; do not weaken existing lifecycle assertions.
2. Review every observability call site and captured-log test against the design's prohibited-data list. Search for event calls near request bodies, `storyId`, story/segment text, token fields, cache paths, authorization data, and raw caught errors; confirm none are passed into logger payloads or adjacent free-form Edge logs.
3. With the user approving any provider cost required, perform one connected development run through Metro or React Native DevTools:

   - capture a successful `generate-story` client start/terminal pair;
   - use its `x-client-operation-id` to locate the matching Edge start/terminal pair;
   - capture at least one TTS segment timeline, including its parent relationship and either token refresh or cache hit;
   - verify each line parses independently as JSON and contains no prohibited content.

   If approval for a paid call is not provided, use an already available local/deployed safe test path or record the manual provider validation as pending; do not trigger a paid request automatically.
4. Build or run with production semantics (`__DEV__ === false`) using the project's normal Expo release path and confirm no structured client events reach the console. This is a build-time enablement check only; do not add a production toggle.
5. Manually exercise one cancellation or forced failure path if it can be done without paid traffic. Confirm the terminal outcome is singular and does not claim server or Inworld transport cancellation beyond what the client observed.

**Verify**

- `npm run test:ci -- --runInBand`
- `npm run test:functions`
- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:functions`
- `git diff --check`
- Record the connected-development correlation IDs, event-name sequence, development/production enablement result, privacy review, and any manual step deferred for cost/credentials in the implementation handoff. Do not include secrets, bodies, generated content, or raw errors in that record.

## Execution Handoff

Use inline execution for Tasks 1-4 because the closed event contract, wrapper error semantics, Edge header validation, and TTS operation hierarchy are tightly coupled and each later task depends on the exact interfaces established earlier. After implementation, use a fresh focused review agent before Task 5; independent review is especially valuable for exactly-once terminal events, error-identity preservation, cancellation races, and privacy leaks, while parallel implementation would create avoidable contract churn.

# Client Observability for Supabase Functions and Inworld TTS

Status: Approved design
Date: 2026-08-16
Scope: Development-only structured diagnostics for Expo client requests, Supabase Edge Function correlation, and Inworld TTS lifecycle events

## Summary

BedtimeMagic will add a small, typed client-observability layer that emits privacy-safe, one-line JSON events during local development. The first release uses the console as its only sink so events are visible in Metro and React Native DevTools without adding a monitoring vendor, native dependency, remote ingestion, or device-log retention.

The design instruments the three existing Supabase Edge Function calls and the segmented Inworld TTS pipeline. Every high-level operation receives an opaque operation ID, allowing a developer or AI agent to reconstruct request timelines and correlate client events with custom Edge Function logs. Instrumentation must not change request, retry, cache, cancellation, playback, or user-facing behavior.

## Problem

The Edge Functions currently expose automatic invocation metadata and some server-side error logs, but the Expo client has almost no durable diagnostic structure. A failed story request is logged only at its final lifecycle boundary, and most client Supabase calls have no start, outcome, duration, or correlation metadata.

The TTS path has additional invisible stages:

- Inworld token cache lookup and refresh.
- Audio-segment cache lookup.
- In-flight segment deduplication.
- SDK request-start retries.
- App-owned mid-stream retries.
- Best-effort cancellation.
- Partial-file cleanup and completed-file finalization.
- Cache eviction.

When audio fails or stalls, the current output cannot reliably show which stage failed, whether a retry occurred, or which events belonged to the same playback or prefetch operation. Inworld synthesis occurs directly from the device after token issuance, so Supabase logs cannot observe that part of the lifecycle.

## Goals

- Make local Supabase Function and Inworld TTS failures diagnosable from a connected development session.
- Emit consistent machine-readable events that are useful to both developers and AI agents.
- Correlate each client Supabase invocation with its Edge Function execution.
- Reconstruct TTS prefetch and segment timelines across cache, token, retry, success, failure, deduplication, and cancellation paths.
- Record useful timing and outcome metadata without recording child or story content.
- Centralize enablement, serialization, redaction, and sink behavior.
- Preserve the current public API behavior and all request lifecycle semantics.
- Leave a clean seam for a future device-file or remote-monitoring sink without implementing either now.

## Non-goals

- Production crash reporting, alerting, dashboards, metrics aggregation, or remote log ingestion.
- Sentry, OpenTelemetry SDK configuration, Supabase Log Drains, or another observability vendor.
- Persistent on-device logs, log export UI, file rotation, or retention controls.
- Instrumenting ordinary PostgREST queries, authentication, navigation, rendering, or audio-player state broadly.
- Logging prompts, generated content, request or response bodies, audio chunks, or raw provider errors.
- Replacing React Native DevTools, native device logs, or the Expo network inspector.
- Changing retries, timeouts, caching, cancellation, story generation, or playback behavior.
- Adding user-visible logging controls or UI.

## Design Principles

### Structured events over prose

Each record is serialized as one line of JSON with a stable event name and event-specific metadata. Call sites must not construct prose log messages or pass arbitrary objects to the logger.

This shape makes logs searchable, permits chronological reconstruction, and avoids depending on fragile message parsing.

### One terminal event per operation

Every started operation emits exactly one corresponding terminal outcome: succeeded, failed, or cancelled. Retry events are intermediate and do not replace the final outcome.

### Allowlisted metadata only

The event type defines the fields a caller may provide. The serializer does not recursively dump unknown objects, Supabase results, SDK values, or `Error` instances.

### Instrument boundaries, not implementation noise

Log meaningful lifecycle changes. Do not log individual audio chunks, render cycles, state setter calls, or repeated polling-like events that do not change diagnostic understanding.

### No behavioral coupling

Logging must never decide whether an operation proceeds, retries, cancels, succeeds, or fails. A sink or serialization failure must not alter the application path.

## Event Envelope

Every event uses a common envelope:

```ts
type ObservabilityEvent = {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  event: ObservabilityEventName;
  operationId: string;
  parentOperationId?: string;
  durationMs?: number;
  // Additional fields are defined by the selected event name.
};
```

- `timestamp` is an ISO-8601 UTC timestamp created by the logger.
- `operationId` is an opaque locally generated identifier and is never derived from a user, child, story, prompt, token, or file path.
- `parentOperationId` links a nested operation, such as token acquisition or a segment stream, to its containing TTS run.
- `durationMs` is elapsed wall-clock duration rounded to a whole non-negative millisecond.
- Event metadata is limited to JSON primitives defined in the typed event map.

Operation IDs need uniqueness only within diagnostic logs. Their creation must use a supported runtime API and must not add identity or device fingerprinting information.

## Client Logger

Add one client module, conceptually `src/lib/observability.ts`, that owns:

- The typed event-name-to-payload map.
- Operation ID creation.
- Timestamping and duration helpers.
- Safe error categorization.
- JSON serialization.
- Sink dispatch.
- Build-time enablement.

The initial sink emits one JSON string per event through the console method matching the event level. Sink calls are guarded so an unexpected logging failure cannot reject or interrupt the observed operation.

Logging is enabled only when `__DEV__` is true. No public environment variable or runtime toggle is introduced in the first release. Standalone and published production builds therefore do not emit these diagnostic records.

The sink boundary remains internal and replaceable. A future design may add a bounded JSONL file sink or a remote provider, but callers continue emitting the same typed events.

## Supabase Function Instrumentation

### Shared invocation boundary

Add one generic wrapper around `supabase.functions.invoke`. It preserves the current invocation inputs and returned data while adding diagnostics around the call.

For every invocation it:

1. Creates a client operation ID.
2. Emits `supabase.function.started`.
3. Adds the operation ID as the `x-client-operation-id` request header while preserving any caller-provided headers.
4. Invokes the function with the original body and optional `AbortSignal`.
5. Emits exactly one terminal event with elapsed duration.
6. Returns the successful data or throws the original failure so existing callers retain their current behavior.

The first release migrates only these functions:

- `generate-story`
- `generate-cover-image`
- `generate-inworld-token`

The wrapper accepts only the allowlisted function-name union above. Broad support for arbitrary function names is unnecessary until another function call is added.

### Supabase events

```text
supabase.function.started
supabase.function.succeeded
supabase.function.failed
supabase.function.cancelled
```

Allowed metadata:

- `functionName`
- `durationMs` on terminal events
- `errorKind` on failure
- `status` when a safe numeric HTTP status is available

The wrapper distinguishes documented Supabase client failure categories without consuming or logging response bodies:

- `http`: the function executed and returned a non-success response.
- `relay`: the Supabase relay failed.
- `network`: the client could not reach the function, including a thrown fetch error.
- `unknown`: the failure does not match a supported category.

If the supplied signal is aborted before settlement, the terminal event is `cancelled`. Cancellation remains best effort and must not be represented as proof that server-side work stopped.

### Edge Function correlation

Each of the three Edge Functions reads `x-client-operation-id` and includes it in structured start and terminal logs. The header value is treated only as diagnostic input: it grants no authorization and does not influence request behavior.

If the header is absent or malformed, the function logs a neutral missing correlation value and continues normally. Header validation accepts only a short bounded opaque identifier so arbitrary client text cannot be injected into server logs.

Edge Function events use the same conceptual lifecycle:

```text
edge.function.started
edge.function.succeeded
edge.function.failed
```

Allowed server metadata includes:

- `operationId`
- `functionName`
- `durationMs`
- safe status or failure category
- safe upstream name where relevant, such as `inworld`, `mimo`, or `ai-gateway`

Custom function logs complement Supabase's automatic invocation records. They do not duplicate headers, bodies, tokens, or generated results. Existing free-form error logs should be migrated where needed so raw third-party errors are not emitted alongside the new privacy-safe events.

The implementation must preserve any CORS behavior required by supported Expo targets when accepting the custom header.

## Inworld TTS Instrumentation

### Operation hierarchy

A story-audio prefetch or foreground segment-loading run owns a parent TTS operation ID. Token and segment work receive child operation IDs and retain the parent ID.

Persistent story IDs are not used as correlation keys. The hierarchy provides enough same-run correlation without exposing database identifiers.

An in-flight deduplicated caller observes the operation already responsible for the segment rather than creating a second apparent stream. The deduplication event links to the active segment operation when practical.

### TTS events

Prefetch lifecycle:

```text
tts.prefetch.started
tts.prefetch.succeeded
tts.prefetch.failed
tts.prefetch.cancelled
```

Allowed metadata includes `segmentCount` and terminal `durationMs`.

Token lifecycle:

```text
tts.token.cache_hit
tts.token.refresh_started
tts.token.refresh_succeeded
tts.token.refresh_failed
```

Allowed metadata includes safe cache state and terminal `durationMs`. Tokens, expiration timestamps, session data, and authorization material are never logged.

Segment lifecycle:

```text
tts.segment.cache_hit
tts.segment.deduplicated
tts.segment.started
tts.segment.retrying
tts.segment.succeeded
tts.segment.failed
tts.segment.cancelled
```

Allowed metadata includes:

- `segmentIndex`
- `segmentCount` when known by the parent operation
- `attempt`
- `durationMs`
- `bytesWritten` after successful finalization
- safe `errorKind` on retry or failure

No event includes segment text, text length, audio bytes, a cache URI, a file path, the voice token, or the Inworld request body. Individual stream chunks are not logged.

The existing SDK request-start retries and app-owned mid-stream retry loop remain unchanged. `tts.segment.retrying` describes only the explicit retry visible to the app; the design must not claim visibility into an SDK-internal retry unless the supported SDK API exposes it directly.

### Cancellation and late settlement

Cancellation events describe client intent and observed local termination. They do not claim the underlying Inworld HTTP request was aborted because the current SDK stream does not accept the app's `AbortSignal`.

Late chunks, generator return behavior, partial-file cleanup, and dedupe-map cleanup retain their existing semantics. Instrumentation records outcomes after those boundaries but does not add alternate cancellation paths.

## Privacy and Security

The following values must never appear in client or custom Edge Function events:

- Child names, nicknames, IDs, developmental stages, or challenge selections.
- User IDs, email addresses, session objects, JWTs, API keys, or authorization headers.
- Story IDs, titles, story text, prompts, Pillow Talk, affirmations, or generated JSON.
- Supabase invocation bodies or successful response bodies.
- Inworld tokens, token expiration values, synthesis text, audio data, or SDK request bodies.
- Local cache URIs, file paths, or filenames.
- Complete raw errors, stack traces serialized as data, or arbitrary third-party response bodies.
- Device identifiers or fingerprints.

An error sanitizer returns only an allowlisted category, safe error class name when useful, and numeric HTTP status when available. It does not spread, stringify, or recursively inspect an `Error`, `Response`, Supabase result, or SDK object.

The logger API must make the safe path the easy path: event-specific payload types contain no fields for raw messages or arbitrary context. Type safety is supported by runtime construction rules because compile-time types alone cannot protect JavaScript callers or unsafe casts.

## Failure Handling

- A logger or sink failure is swallowed after a best-effort fallback and never changes the observed request.
- Serialization handles only the known primitive envelope, preventing cycles and oversized object traversal.
- A missing operation ID header does not fail an Edge Function request.
- An invalid operation ID is not echoed into logs.
- A failed success-log emission does not convert a successful request into a failure.
- A failed failure-log emission does not replace or mask the original error.
- Duration measurement failure omits the duration rather than changing behavior.

## Testing Strategy

### Logger tests

- Each event serializes to a single valid JSON record with the common envelope.
- Level dispatch selects the expected console method.
- Operation IDs are opaque and do not incorporate supplied domain data.
- Disabled logging produces no console output or observable side effects.
- A throwing sink does not throw through the caller.
- Runtime construction excludes unknown metadata.
- Error sanitization returns only allowlisted fields and never serializes a raw error.

### Supabase wrapper tests

- Start and success events share one operation ID and include duration.
- HTTP, relay, fetch/network, and unknown failures receive the correct category.
- An aborted signal produces a cancellation event.
- Each invocation produces exactly one terminal event.
- The original body, caller headers, and `AbortSignal` are preserved.
- The correlation header is added without replacing existing headers.
- Successful data and thrown errors retain the existing caller-facing contract.
- Tests for story, cover, and token APIs verify migration through the wrapper.

### Edge Function tests

- A valid correlation header appears in start and terminal structured logs.
- Missing and invalid headers do not fail the request and are not echoed unsafely.
- Success and each handled failure path emit one terminal event.
- No logged record contains request bodies, generated content, secrets, tokens, or raw upstream errors.
- CORS and authenticated invocation behavior remain unchanged.

### TTS tests

- Token cache hits and refresh outcomes emit the expected lifecycle.
- Segment cache hits do not emit a false stream start.
- Concurrent callers record deduplication without creating a second stream lifecycle.
- A successful segment emits start and success with its attempt and byte count.
- A mid-stream failure emits retrying and then one final success or failure.
- Cancellation emits a cancellation outcome and preserves current cleanup behavior.
- Prefetch events contain segment count but no story text or persistent story ID.
- Serialized output never contains token values, segment text, cache paths, raw audio, or raw errors.

Tests assert event names, safe metadata, correlation, and ordering. They do not assert exact timestamps, operation IDs, or duration values.

## Validation

Implementation validation must include:

- Focused Jest tests for the logger, Supabase invocation wrapper, story API, and TTS lifecycle.
- Focused Deno tests for the three instrumented Edge Functions.
- `npm run lint`.
- `npm run typecheck`.
- The relevant Deno typecheck and function test commands.
- `git diff --check`.
- One manual connected-development run that captures a successful story function call and at least one TTS segment timeline in Metro or React Native DevTools.

Paid live provider calls are not required for automated validation and must not be made without explicit approval.

## Acceptance Criteria

- A developer can identify when each instrumented Supabase Function started, how it ended, and how long it took.
- A client operation ID can locate the corresponding custom Edge Function lifecycle logs.
- A developer can determine whether TTS used cached audio, refreshed a token, deduplicated work, retried a stream, succeeded, failed, or was cancelled.
- Every started operation has exactly one terminal outcome.
- Events are one-line structured JSON with stable typed names.
- Client logs are emitted only in development builds.
- No prohibited child, story, authentication, token, prompt, audio, file, device, request-body, response-body, or raw-error data is logged.
- Existing behavior and public request semantics remain unchanged.
- No remote service, native observability dependency, persistent log store, UI, or schema change is introduced.

## Future Upgrade Triggers

Revisit the sink design only when one of these requirements appears:

- Bugs must be diagnosed after a device disconnects from the development session.
- Internal testers need to export a bounded diagnostic artifact.
- Production crashes or field failures need automatic reporting and alerting.
- Cross-service latency and traces must be aggregated rather than inspected manually.

A device-file sink should add explicit size bounds, rotation, retention, deletion, and export review. A production provider should add sampling, consent and privacy review, environment separation, source-map handling, release metadata, and server-log correlation. Neither upgrade should require rewriting the event call sites defined by this design.

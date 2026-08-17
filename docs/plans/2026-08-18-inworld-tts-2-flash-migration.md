# Inworld TTS-2 Flash Migration Implementation Plan

**Goal:** Move new BedtimeMagic story synthesis from `inworld-tts-1.5-mini` to `inworld-tts-2-flash` while preserving the established, reliable narration pipeline and removing one redundant request option.

**Design:** Approved conservative Flash migration from the 2026-08-18 brainstorming session.

**Constraints:**

- Keep the existing natural-boundary segmentation (400–600-character opening target, 500-character preferred later chunks, 1,900-character cap), sequential generation, MP3 output, local cache, retry/deduplication/cancellation behaviour, and Expo playlist handling unchanged.
- Retain `Ashley` and `speakingRate: 0.9`; that rate is a deliberate bedtime-product choice, not a Mini-specific workaround.
- Omit `temperature: 1.0`. It is the SDK default and is not a useful TTS-2 tuning control.
- Do not add steering tags, WebSocket synthesis, parallel segment synthesis, model selection infrastructure, a dependency update, or a cache-key migration. Flash does not support steering, and a single global model migration does not require invalidating already cached story audio.
- Do not make paid Inworld requests as part of implementation or automated validation. The listening gate below requires separate explicit approval.

### Task 1: Specify the new request contract in focused tests

**Files / symbols**

- Modify: `src/lib/__tests__/inworld-tts.test.ts` — `streamStorySegment` cache-miss request assertion.

**Implementation**

1. Update the existing `mockStream` assertion for a cache miss to expect `model: 'inworld-tts-2-flash'`.
2. Remove `temperature` from that expected request object. The current exact-object assertion must therefore fail if the production request continues sending the redundant option.
3. Keep the assertions for `text`, `voice: 'Ashley'`, `encoding: 'MP3'`, and `speakingRate: 0.9`; they protect the intentionally unchanged audio contract.
4. Do not change cache-hit, retry, cancellation, prefetch, or observability tests: their behaviour is model-agnostic and must remain intact.

**Verify**

- `npm run test:ci -- --runInBand src/lib/__tests__/inworld-tts.test.ts` initially fails only because production code still sends the old request contract.

### Task 2: Apply the minimal Flash request change

**Files / symbols**

- Modify: `src/lib/inworld-tts.ts` — module-level TTS request constants and the `tts.stream()` call in `streamStorySegment`.

**Dependencies:** Task 1.

**Implementation**

1. Define small module-local constants adjacent to the existing retry constants for the model ID, voice ID, and speaking rate:
   - model: `inworld-tts-2-flash`
   - voice: `Ashley`
   - speaking rate: `0.9`
2. Replace the inline literals in `tts.stream()` with those constants.
3. Remove the explicit `temperature: 1.0` property from `tts.stream()`.
4. Preserve every other request field and all surrounding control flow, including MP3 encoding, writer lifecycle, SDK/app retry division, token refresh, deduplication, cancellation counters, cache access, and observability payloads.
5. Do not change `src/lib/story-segments.ts`, `src/contexts/PlayerContext.tsx`, `src/lib/audio-cache.ts`, story-generation prompts, Supabase token generation, or `package.json`. The installed SDK accepts model IDs as strings and forwards the request contract used here; no Flash-specific SDK capability is needed for this migration.

**Verify**

- `npm run test:ci -- --runInBand src/lib/__tests__/inworld-tts.test.ts`
- Confirm the focused suite proves the Flash request is emitted on a cache miss and that cache, retry, cancellation, and sequential-prefetch behaviours still pass.

### Task 3: Validate the affected client surface and retain a release quality gate

**Files / symbols**

- No production-file changes.

**Dependencies:** Tasks 1–2.

**Implementation**

1. Run required repository checks after the code change:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:ci -- --runInBand src/lib/__tests__/inworld-tts.test.ts src/lib/__tests__/story-segments.test.ts src/contexts/__tests__/PlayerContext.test.tsx`
   - `git -c core.fsmonitor=false diff --check`
2. Record existing lint warnings as warnings only; resolve any new lint or type errors before handoff.
3. Treat provider quality as a separate manual release gate, not an automated or implementation prerequisite. With separate approval for paid calls, synthesize the same six fixed representative excerpts with Mini and Flash using fresh temporary story IDs, `Ashley`, MP3, and `speakingRate: 0.9`:
   - preschool transition/bedtime text;
   - preschool emotional-regulation text;
   - early-primary dialogue-heavy text;
   - early-primary sharing/repair text;
   - older-child proper-noun/pronunciation text;
   - older-child long calm-landing text.
4. Listen on physical iOS and Android devices, with model identity hidden during scoring. Accept Flash only if it is not worse than Mini for word accuracy, calm/warm delivery, paragraph-boundary seams, and absence of playback underruns; use the existing development-only lifecycle timings to compare time to the first completed playable segment. Keep the results as release evidence, not application telemetry.

## Execution Handoff

Execute this plan inline. It is a small, tightly coupled source-and-test update whose correctness depends on preserving the existing streaming, cache, and playlist contract. No subagent split is warranted. The paid listening gate remains explicitly out of scope until separately authorized.

# Unified Post-Story Wind-Down Implementation Plan

**Goal:** Replace the duplicate post-story screens with one accessible `StoryPlayer` sequence that moves from narration through Pillow Talk and affirmation, fades to black for one second, and then returns to the originating screen.

**Design:** `docs/specs/2026-08-16-post-story-wind-down-design.md`

**Confidence:** High. The active route, duplicate components, integrated player UI, player-context transitions, all direct API callsites, Jest mocks, and focused tests were inspected. The implementation is a clean cutover within existing React Native, Expo Router, Reanimated, and audio patterns; it requires no schema, generated-story, dependency, or theme-token change.

**Constraints:**

- Keep one render path: after data loading, `story.tsx` renders `StoryPlayer` for `idle`, `fading`, `pillow_talk`, `affirmation`, `fade_to_black`, and the final `done` frame.
- Replace the context actions `skipPillowTalk`, `confirmAffirmation`, and `startFadeToBlack` with exactly `showAffirmation(): void`, `finishWindDown(): void`, and `completeWindDown(): void`. `completeWindDown` is the curtain-animation completion boundary used only by `StoryPlayer`. Migrate every caller and mock in the same task; do not leave aliases or deprecated methods.
- `finishWindDown` starts the audio and visual fade; `completeWindDown` owns cleanup and `done`. Navigation timing is therefore driven by the completed 1000ms visual curtain, not ambient-player availability or a competing JavaScript timer.
- Keep the existing 3000ms narration fade separate from the 1000ms terminal fade.
- Use existing tokens and primitives from `@/theme`, `ThemedText`, `Button`, and `IconButton`. Do not add tokens, dependencies, gradients, shadows, springs, or new component abstractions.
- Use Reanimated shared values only through `.get()` and `.set()`.
- React Compiler is enabled: do not add `useMemo`; add `useCallback` only where a stable effect dependency actually requires it.
- Use Reanimated's installed `useReducedMotion(): boolean` API rather than a custom accessibility subscription.
- Use primary **Show affirmation** / **Goodnight** actions and a ghost **Skip wind-down** action.
- After each code-changing task, run `npm run lint` and `npm run typecheck`; fix every error before continuing. Never suppress a lint or TypeScript rule.

**Verified codebase facts the executor should use directly:**

- `src/app/(index,vault)/story.tsx` currently swaps `StoryPlayer` for standalone `PillowTalk` and `Affirmation`; its `done` effect already calls `router.back()` and its ordinary back callback stops audio before returning.
- `src/components/story/story-player.tsx` is the sole production caller of its `StoryPlayer` export. Its optional `postStoryPhase` prop exists only for tests and should be removed; production phase already comes from `usePlayer()`.
- `src/components/story/story-player.tsx` already has integrated post-story content, artwork sizing, a background/sleep dim treatment, and a curtain, but also has a five-second control timer, tap/pan gestures, gesture hints, foreground dimming, and 4000ms terminal timing that must be removed or corrected.
- `src/components/story/wind-down.tsx` is the shared integrated presentation file. `GestureHintCue` has no valid role after the cutover.
- `src/contexts/PlayerContext.tsx` uses `fadeIntervalRef` for audio fades and `playbackGenerationRef` to reject stale work. `cleanupPlaylist()` already clears the active fade interval and both playlist and ambient resources.
- `src/contexts/PlayerContext.tsx::startFade` currently starts ambient audio only when a prompt exists, advances directly to `done` when both fields are empty, and can throw if ambient-player creation fails. All three behaviors need the approved fallbacks below.
- Persisted `Story` fields are typed as non-null strings, but empty strings are sufficient for focused missing-content tests.
- Reanimated 4.3.1 exports `useReducedMotion(): boolean`. The repository's `jest.setup.js` mock does not yet expose it.
- `MaxContentWidth` is exported by `@/theme`; `Button` already guarantees a 44pt minimum target and supports `primary`, `secondary`, and `ghost` variants.
- No code outside the route, `StoryPlayer`, their tests, and `PlayerContext` references `skipPillowTalk`, `confirmAffirmation`, or `startFadeToBlack`.

### Task 1: Cut over to one deterministic post-story lifecycle

**Outcome:** The route always keeps `StoryPlayer` mounted; Pillow Talk actions have distinct outcomes; every post-story exit spends 1000ms in `fade_to_black`; cleanup and `done` occur once even without ambient audio.

**Files / symbols**

- Modify: `src/contexts/PlayerContext.tsx` — `PlayerContextValue`, context defaults, `startAmbient`, `startFade`, post-story actions, provider value, cleanup guards
- Modify: `src/contexts/__tests__/PlayerContext.test.tsx` — context harness and post-story lifecycle cases
- Modify: `src/components/story/story-player.tsx` — `StoryPlayerProps`, phase selection, Back behavior, persistent post-story actions, terminal input curtain
- Modify: `src/components/story/__tests__/story-player.test.tsx` — post-story interaction contract and context mocks
- Modify: `src/app/(index,vault)/story.tsx` — single player render path, `beforeRemove` post-story guard, completed navigation
- Modify: `src/app/__tests__/story.test.tsx` — unified route and navigation behavior
- Modify: `jest.setup.js` — make the Reanimated timing mock invoke animation completion callbacks
- Delete: `src/components/story/pillow-talk.tsx`
- Delete: `src/components/story/affirmation.tsx`
- Delete: `src/components/story/__tests__/pillow-talk.test.tsx`
- Delete: `src/components/story/__tests__/affirmation.test.tsx`

**Implementation**

1. Write the focused tests first, using fake timers for the narration and audio-volume intervals:
   - Extend the context harness with actions for `showAffirmation`, `finishWindDown`, and `completeWindDown`, plus story variants whose prompt, affirmation, or both are empty strings.
   - Preserve the existing assertion that duplicate final playlist events enter the post-story sequence once.
   - Assert the full-content path: the 3000ms narration fade enters `pillow_talk` and starts ambient once; `showAffirmation` enters `affirmation` without removing or restarting ambient; `finishWindDown` enters `fade_to_black` immediately and lowers audio over 1000ms but does not enter `done`; `completeWindDown` then cleans up and enters `done`.
   - Assert `showAffirmation` starts the terminal fade when the affirmation is empty.
   - Assert a missing prompt enters affirmation directly and still starts ambient once.
   - Assert missing prompt and affirmation enter `fade_to_black` without an ambient player and remain there until `completeWindDown` is called.
   - Make `mockCreateAudioPlayer` throw once and assert the content phase and terminal completion still work normally.
   - Invoke `finishWindDown` and `completeWindDown` repeatedly before React state settles and assert one audio fade, one audio removal/destruction, one synthesis cancellation, and one `done` transition.
2. Change `PlayerContextValue` and its default/provider values to expose only:
   - `showAffirmation(): void`
   - `finishWindDown(): void`
   - `completeWindDown(): void`
   Remove all three obsolete post-story methods rather than wrapping them.
3. Add synchronous finishing and completion refs, reset only when a new story starts or a story is explicitly stopped. `finishWindDown` must return when finishing has already started; `completeWindDown` must return unless finishing is active and incomplete. These guards cover repeated calls before a rerender.
4. Implement the terminal boundary:
   - `finishWindDown` marks the finishing guard, sets `postStoryPhase` to `fade_to_black` immediately, and clears any active narration-fade interval.
   - Capture the current playlist and ambient starting volumes. Over 1000ms in `AMBIENT_FADE_INTERVAL` steps, lower whichever players exist; this also handles Back during the preceding `fading` phase without leaving narration audible. If neither exists, keep the phase in `fade_to_black` and wait for visual completion rather than selecting an immediate completion path.
   - `completeWindDown` marks the completion guard, cancels pending synthesis for the active story, increments `playbackGenerationRef`, releases playlist/listener/ambient resources, resets story playback state, and sets the phase to `done` exactly once.
   - Explicit stop and provider unmount still clear a running audio fade through existing cleanup.
5. Make ambient start best effort. Catch player construction/playback failure locally, leave `ambientPlayerRef` null, and continue to the selected content phase; do not suppress or alter the visual flow.
6. Update `startFade` after the 3000ms narration fade:
   - If either post-story string is present, attempt to start ambient once.
   - Select `pillow_talk` when the prompt is present.
   - Otherwise select `affirmation` when the affirmation is present.
   - Otherwise call `finishWindDown` so missing content still receives the terminal curtain before `done`.
7. Implement `showAffirmation` without touching ambient audio. It sets `affirmation` when non-empty affirmation text exists; otherwise it calls `finishWindDown`.
8. Cut over `StoryPlayer` to the context phase:
   - Remove the test-only `postStoryPhase` prop and `propsPostStoryPhase` fallback.
   - Treat `fading`, `pillow_talk`, `affirmation`, `fade_to_black`, and `done` as post-story states for hiding playback controls and the sleep-mode button. During `fading`, retain compact artwork but show no content action yet.
   - Route **Show affirmation** to `showAffirmation`; route ghost **Skip wind-down** and **Goodnight** to `finishWindDown`.
   - Remove `controlsVisible`, its timer/ref, tap-to-toggle behavior, `GestureDetector`, pan/tap gestures, gesture hints, and directional entering/exiting transitions. Retain `runOnJS` only for the terminal curtain's animation-completion callback. The post-story buttons stay rendered for the entire content phase.
   - For the player Back button: call the existing `onBack` only during ordinary playback; call `finishWindDown` during `fading`, Pillow Talk, or affirmation; ignore input during `fade_to_black` and `done`.
   - Keep a full-screen terminal curtain above the UI for `fade_to_black` and `done`. Animate it to opaque over 1000ms; when Reanimated reports `finished === true`, invoke `completeWindDown` through `runOnJS`. Set `pointerEvents="auto"` while terminal so it intercepts input. Keep it opaque for `done`, and do not use it as the ordinary background-dimming layer.
   - Update the Jest `withTiming` mock to accept the production `(toValue, config, callback)` signature, invoke `callback?.(true)`, and return `toValue`. This lets the player test observe `completeWindDown` without adding test-only production behavior.
9. Simplify `story.tsx` so every loaded story returns `StoryPlayer`. Remove the standalone imports, post-story action destructuring, and conditional component returns. Keep loading/error states, the `done` navigation effect, image caching, prefetching, and ordinary `onBack` stop-and-return callback. Use the repository's existing `useNavigation()` plus `navigation.addListener('beforeRemove', ...)` pattern while the phase is `fading`, `pillow_talk`, `affirmation`, or `fade_to_black`: call `event.preventDefault()` and `finishWindDown()` instead of dispatching the removal action. The listener is absent for `idle` and `done`, so ordinary playback Back remains immediate and the existing `router.back()` after `done` is allowed through.
10. Delete the now-unreferenced standalone components and their tests. Update all context mocks in the remaining route/player tests to the new API.
11. Update player/route tests to defend observable behavior:
    - Pillow Talk renders the prompt, **Show affirmation**, and **Skip wind-down**; the two buttons call different context methods.
    - Advancing renders affirmation through context phase and **Goodnight** calls `finishWindDown`.
    - Buttons remain present after advancing fake timers well beyond the old five- and fifteen-second delays.
    - Swipe hints are absent.
    - The sleep-mode control is absent in every post-story phase.
    - Post-story Back calls `finishWindDown` without calling the route's immediate `onBack`; ordinary Back still calls `onBack`.
    - `fade_to_black` exposes the intercepting terminal curtain and no actionable controls; the curtain's successful animation callback calls `completeWindDown` once.
    - At route level, the integrated player artwork/header remains present during Pillow Talk, proving the route did not swap to a standalone screen; a mocked `beforeRemove` during every nonterminal post-story phase is prevented and starts `finishWindDown`; `done` removes the guard and calls `router.back()` once.
    - Remove obsolete gesture-handler mocks from tests once `StoryPlayer` no longer imports gesture-handler.

**Verify**

- `npm run test:ci -- src/contexts/__tests__/PlayerContext.test.tsx src/components/story/__tests__/story-player.test.tsx src/app/__tests__/story.test.tsx --runInBand`
- Expected: full-content, missing-content, ambient-failure, idempotent finish, distinct button outcomes, persistent actions, Back behavior, and delayed navigation contracts pass.
- `npm run lint`
- `npm run typecheck`
- `grep` with the repository search tool for `skipPillowTalk|confirmAffirmation|startFadeToBlack|Skip for tonight|Swipe for` under `src` returns no matches.
- `grep` with the repository search tool for imports of `pillow-talk` or `affirmation` under `src` returns no matches.

### Task 2: Finish the low-stimulus visual and accessibility treatment

**Outcome:** The unified surface matches the approved hierarchy, keeps foreground contrast intact, accommodates small screens and long generated text, announces phase changes, and becomes static under reduced motion.

**Files / symbols**

- Modify: `src/components/story/story-player.tsx` — background/artwork layers, phase crossfade, reduced motion, accessibility announcement, responsive column
- Modify: `src/components/story/wind-down.tsx` — labeled scrollable content and token-based styles; remove `GestureHintCue`
- Modify: `src/components/story/__tests__/story-player.test.tsx` — visual-state and accessibility behavior
- Modify: `src/components/story/__tests__/wind-down.test.tsx` — labels, text, pacer sizes, no hint surface
- Modify: `src/components/breathing-circle.tsx` — reduced motion and flat treatment
- Modify: `src/components/__tests__/breathing-circle.test.tsx` — static reduced-motion contract and removal of shadow expectation
- Modify: `jest.setup.js` — deterministic `useReducedMotion` Reanimated mock

**Dependencies:** Task 1 establishes the single phase/action contract and removes the competing screens.

**Implementation**

1. Add `useReducedMotion: jest.fn(() => false)` to the repository Reanimated mock and restore it to `false` in each affected test's `beforeEach`. Make `withRepeat` a Jest mock that preserves its existing identity return behavior so the reduced-motion test can prove it was not called; do not replace the production API with test-only branches.
2. Update `BreathingCircle`:
   - Read `useReducedMotion()` once.
   - In normal mode, keep the existing restrained repeated timing behavior and `.get()`/`.set()` access.
   - In reduced-motion mode, set a stable scale and opacity and do not start `withRepeat` animations.
   - Remove `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, and `elevation`; the circle uses only the existing low-opacity bedtime tint.
   - Replace the existing fixed-shadow test with a reduced-motion test proving no repeat animation starts and the rendered circle remains at its static scale.
3. Refactor `wind-down.tsx` into the shared content presentation used only by `StoryPlayer`:
   - Remove `GestureHintCue` and its styles/export.
   - Render a small `textSecondary` label with `accessibilityRole="header"`, then generated text using the theme's `heading` typography, followed by the breathing pacer.
   - `PillowTalkContent` uses label **Pillow talk** and a 120pt pacer.
   - `AffirmationContent` uses label **Say together** and a 160pt pacer.
   - Put label/text/pacer in a `ScrollView` with `showsVerticalScrollIndicator={false}`. Give its content container `flexGrow: 1` so short content stays centered and long content scrolls. Keep bottom actions outside the `ScrollView` so text cannot overlap them on a small phone.
   - Use only `Spacing`, `Typography`/`ThemedText` presets, and color tokens; remove hardcoded 23/34 typography values.
4. Correct `StoryPlayer`'s layer order and progression:
   - Add an absolute `bgDeepest` background-dimming layer behind the safe-area foreground. Time its opacity over 1000ms to `0` for ordinary playback, `0.6` for `fading`/Pillow Talk, and `0.85` for affirmation. Do not reuse the terminal curtain for this.
   - Keep foreground labels, generated text, buttons, and Back above background dimming at their normal token opacity.
   - Keep the terminal curtain as a separate final foreground layer, opaque for `done` to prevent a bright one-frame flash before route navigation.
   - During `fading`, time artwork to exactly 160pt over 1000ms and let an active sleep overlay wake away over the existing 1000ms. The sleep overlay target is dark only when `isSleepMode && postStoryPhase === 'idle'`; post-story content must not remain hidden by sleep mode.
   - Show compact square artwork in `fading` and Pillow Talk. On affirmation, conditionally remove it with a 400ms opacity exit so it does not reserve unusable vertical space on a small screen.
   - Replace directional `FadeInRight`/`FadeOutLeft` with 400ms `FadeIn`/`FadeOut` opacity transitions for Pillow Talk and affirmation content.
   - Center the whole content column with `MaxContentWidth`, `width: '100%'`, safe areas, and token spacing. Preserve the existing square artwork clipping and protagonist fallback, and replace the touched artwork container's literal radius with `BorderRadius.lg`.
5. Apply reduced motion consistently in `StoryPlayer`:
   - Do not animate the 15-second artwork drift while reduced motion is enabled.
   - Set artwork dimension directly instead of timing its resize.
   - Omit phase entering/exiting animation builders.
   - Keep the terminal opacity curtain; do not add translation or scale to it.
6. Announce content phases with `AccessibilityInfo.announceForAccessibility` in an effect keyed by the actual phase. Announce `Pillow talk. <prompt>` or `Say together. <affirmation>` once on entry. Do not announce `idle`, `fading`, `fade_to_black`, or `done`. Ensure outgoing conditional content is unmounted so it leaves the accessibility tree.
7. Add focused tests:
   - Shared wind-down content renders the exact label, generated text, and correct 120/160 pacer size.
   - Pillow Talk retains artwork; affirmation no longer exposes the artwork image.
   - Phase entry announces the matching label and generated text once.
   - Outgoing Pillow Talk content and its buttons are absent in affirmation.
   - Reduced-motion mocks prevent breathing repetition and player artwork drift while preserving the terminal curtain state.
   - Do not test raw source text or incidental animation-builder internals; assert rendered/accessibility state and observable animation calls only where they defend reduced motion.

**Verify**

- `npm run test:ci -- src/components/__tests__/breathing-circle.test.tsx src/components/story/__tests__/wind-down.test.tsx src/components/story/__tests__/story-player.test.tsx src/app/__tests__/story.test.tsx --runInBand`
- Expected: exact labels, pacer sizes, retained/removed artwork, phase announcements, hidden outgoing content, and reduced-motion contracts pass.
- `npm run lint`
- `npm run typecheck`
- Review the rendered tree or focused snapshots only as a debugging aid; acceptance depends on the behavioral assertions and device smoke test, not snapshots.

### Task 3: Document the pattern and verify the production flow

**Outcome:** The design system records the shipped wind-down pattern, all automated checks are clean, and the actual iOS and Android surfaces demonstrate the approved sequence from both navigation origins.

**Files / symbols**

- Modify: `DESIGN.md` — Components/Motion guidance for post-story wind-down; YAML front matter remains unchanged
- Reference only: `docs/specs/2026-08-16-post-story-wind-down-design.md`

**Dependencies:** Tasks 1–2 must establish the final shipped behavior before documentation and device verification.

**Implementation**

1. Add a concise **Post-story wind-down** rule under `DESIGN.md`'s Components guidance:
   - Playback, Pillow Talk, affirmation, and fade-out are one progressively dimming surface.
   - Post-story actions remain visible and use buttons rather than hidden gestures.
   - The route returns only after the one-second sleep fade.
   - The breathing pacer is static under reduced motion and has no shadow.
2. Do not modify YAML tokens: this work adds no color, typography, spacing, radius, or component token.
3. Run the focused and full automated suites before device work. Fix source failures rather than weakening assertions or adding suppressions.
4. Exercise the actual sequence using an existing story from the Vault and a story opened from Home/Recent Story. Seek near the end after audio is available or allow narration to finish; do not use a test-only state switch in production code.
5. On the smallest supported iPhone simulator and a current standard-size iPhone:
   - Verify narration controls disappear when final fading begins and compact artwork remains.
   - Verify sleep mode wakes gently into readable Pillow Talk.
   - Verify long prompt wrapping/scrolling, safe areas, button reachability, and stable Back placement.
   - Verify **Show affirmation** crossfades to **Say together**, removes artwork, retains ambient audio, and exposes only **Goodnight**.
   - Verify **Skip wind-down**, **Goodnight**, and post-story Back each block further input, fade fully to black for approximately one second, then return to the correct origin.
   - Enable Reduce Motion and verify breathing/artwork motion becomes static while the terminal opacity fade remains.
   - Enable VoiceOver and verify each content phase is announced once in the correct order.
6. Repeat the interaction and layout checks on an Android emulator, including TalkBack announcements and Android system Back. Confirm the `beforeRemove` guard added in Task 1 prevents the pop, starts the same terminal fade, and allows the route removal only after `done`.

**Verify**

- `npm run test:ci -- src/contexts/__tests__/PlayerContext.test.tsx src/components/__tests__/breathing-circle.test.tsx src/components/story/__tests__/wind-down.test.tsx src/components/story/__tests__/story-player.test.tsx src/app/__tests__/story.test.tsx --runInBand`
- `npm run test:ci -- --runInBand`
- `npm run lint`
- `npm run typecheck`
- `npm run ios` — complete the iPhone checks above on the actual app surface.
- `npm run android` — complete the Android/TalkBack checks above on the actual app surface.
- Acceptance: one continuous player surface; distinct Pillow Talk actions; visible controls; no gesture hints; accessible foreground contrast; static reduced-motion pacer/artwork; exactly one one-second fade, cleanup, and return for every finish path; correct return origin from Home and Vault.

## Execution Handoff

Recommend **inline execution with a fresh review subagent afterward**. The lifecycle API cutover, audio interval ownership, player render path, and route navigation are tightly coupled and must stay compiling after obsolete methods are removed; sharing context across Tasks 1–2 is safer than splitting implementation among isolated workers. Task 3 is final documentation and real-device verification. After implementation, use a focused reviewer to check state-race safety, accessibility, and divergence from the approved spec before delivery.

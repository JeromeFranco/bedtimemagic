# Session-Scoped Story Generation Status Implementation Plan

**Goal:** Keep one story-generation request alive and parent-controllable across in-app navigation, with session-level generating, ready, and failed status that never forces navigation after the parent leaves.

**Design:** `docs/specs/2026-08-13-session-scoped-story-generation-status-design.md`

**Confidence:** High. The current request is owned by `generate.tsx`, its success callback always replaces the route, `generateStory` has no client signal, and the root provider tree already contains the TanStack Query and selected-child seams needed for an in-memory coordinator. The installed Supabase client accepts `signal` in function invocation options.

**Constraints:**

- Keep the feature in memory only. Do not add persistence, database/Edge Function changes, polling, Realtime, background services, numeric progress, notifications, automatic retries, or concurrent requests.
- Treat cancellation as best effort. Clear local state immediately, abort the current controller, and ignore every late settlement whose request token is no longer current; never imply that an already-persisted story was deleted.
- Capture primitive child and prompt values at start. Never retain the mutable selected-profile object as lifecycle ownership.
- A new explicit start is blocked only while `generating`. From `ready` or `failed`, it may replace the old session status; replacing `ready` must not affect the persisted story, which remains in the Vault.
- Use React Native primitives and the existing design-system components for the shared status. Do not use `NativeTabs.BottomAccessory`: in the installed Expo Router contract it is iOS 26+ only and cannot provide the required cross-platform surface.
- Do not add generation-completion haptics or sounds. Hide the status for the entire `/story` route so generation feedback never overlays playback or its post-story phases.
- Follow React Compiler conventions: no unnecessary `useMemo`; use `useCallback` only where effect/listener identity requires it. Do not add lint or TypeScript suppressions. If Reanimated is used, shared values must use `.get()`/`.set()`.
- After every task that changes code, run `npm run lint` and `npm run typecheck` and fix all errors before continuing.

### Task 1: Move request ownership into a tested session coordinator

**Outcome:** Story generation, input capture, duplicate prevention, cancellation races, retry, cache refresh, and terminal state survive route unmounts under one app-level owner.

**Files / symbols**

- Create: `src/contexts/StoryGenerationContext.tsx` — `StoryGenerationProvider`, `useStoryGeneration`, `StoryGenerationSnapshot`, `StoryGenerationState`
- Create: `src/contexts/__tests__/StoryGenerationContext.test.tsx`
- Modify: `src/api/stories.ts` — `generateStory`
- Modify: `src/api/__tests__/stories.test.ts` — `generateStory` invocation coverage
- Modify: `src/app/_layout.tsx` — mount `StoryGenerationProvider`

**Implementation**

1. Write failing API and provider tests first. Use deferred promises so tests can settle an old request after cancel/retry and prove that obsolete work cannot mutate current state.
2. Extend `generateStory(..., signal?: AbortSignal)` and pass `signal` to `supabase.functions.invoke('generate-story', { signal, body })`. Preserve the current request body and returned `Story` contract.
3. Define a captured request value with exactly:

   ```ts
   type StoryGenerationSnapshot = {
     childId: string;
     childName: string;
     protagonist: Protagonist;
     developmentalStage: DevelopmentalStage;
     category: ChallengeCategory;
     trigger: ChallengeTrigger;
   };
   ```

4. Use a discriminated lifecycle with `idle`, `generating`, `ready`, and `failed`. Every non-idle state carries the captured snapshot and `hasLeftGenerationScreen`; `ready` also carries the returned `Story`, while `failed` retains a diagnostic error that UI consumers must never render. Keep request tokens and the active controller as provider internals rather than exposing them as UI state.
5. Expose public actions with unambiguous behavior:

   - `startGeneration(snapshot)` starts from `idle`, `ready`, or `failed`, but synchronously returns an `already-generating` result without invoking the API when a request is active.
   - `continueInBackground()` marks the active request as left without changing the request token.
   - `resumeWaiting()` marks the active request as intentionally foregrounded again.
   - `cancelGeneration()` is idempotent, invalidates the current token before aborting, and returns the lifecycle to `idle`.
   - `retryGeneration()` starts exactly one new request from the failed snapshot and preserves whether the parent is waiting or elsewhere.
   - `takeReadyStory()` atomically returns the current story and clears ready state, so double effects/taps cannot navigate twice.
   - `dismissStatus()` clears only `ready` or `failed`; it must not cancel generating work or delete data.

6. Keep the latest lifecycle, monotonically increasing request token, and active `AbortController` in refs where synchronous duplicate/race checks are required. A completion handler must compare its token before any cache or state write.
7. On a current success, seed `['story', story.id]`, transition to `ready`, and invalidate the `['stories']` prefix so both unfiltered Vault and child-filtered Home queries refresh. Cache invalidation failure must not discard the returned story or prevent `ready` state. On current failure, log the diagnostic error once and transition to `failed` with generic UI semantics.
8. Mount the provider inside `QueryClientProvider` and `SelectedChildProvider` and above the route tree in `src/app/_layout.tsx`. Do not couple the coordinator to Expo Router; navigation remains a screen/status responsibility.

**Verify**

- `npm run test:ci -- --runInBand src/api/__tests__/stories.test.ts src/contexts/__tests__/StoryGenerationContext.test.tsx`
- Confirm tests cover captured inputs, rapid duplicate starts, ready/failed transitions, retry with the original snapshot, immediate/idempotent cancel, abort signal state, cache seeding/invalidation (including invalidation rejection), late obsolete settlement, and a fresh provider starting at `idle` with no relaunch recovery.
- `npm run lint`
- `npm run typecheck`

### Task 2: Make starting, waiting, leaving, and cancellation route-safe

**Outcome:** Home starts exactly one captured request, the generation route only observes shared work, and visible/system leave paths consistently offer Stay, Keep Creating, and Cancel Story.

**Files / symbols**

- Modify: `src/app/(index,explore)/index.tsx` — `HomeScreen.handleGenerate`
- Modify: `src/app/(index,explore)/generate.tsx` — `GenerateScreen`, leave confirmation, waiting/error effects
- Modify: `src/app/(index,explore)/_layout.tsx` — generation screen navigation options if needed for consistent back interception
- Create: `src/app/__tests__/story-generation-workflow.test.tsx` — shared coordinator/screen/navigation workflow harness

**Dependencies:** Task 1 public state and actions.

**Implementation**

1. Start by adding workflow tests for the Home-to-generation path and all three leave outcomes. Render the real provider, generation screen, and status component in a small test harness; mock only the story API and Expo Router/navigation boundary.
2. Change Home from passing generation parameters for a route-owned mutation to constructing `StoryGenerationSnapshot`, calling `startGeneration`, and then navigating to `/generate`.
   - If the result is `already-generating`, navigate to the existing `/generate` status without changing its child or inputs.
   - Repeated taps in the same render tick must still invoke the backend only once; rely on the coordinator's synchronous ref guard, not button timing or test-only disabling.
3. Remove `useMutation` and all API ownership from `GenerateScreen`. The screen renders the full calming state from shared `generating`, the existing calm error UI from shared `failed`, and never starts a request on mount. If `/generate` is reached while the coordinator is `idle`, return to Home rather than displaying a permanent loading state.
4. When `ready` is observed with `hasLeftGenerationScreen === false`, call `takeReadyStory()` and `router.replace({ pathname: '/story', params: { id } })`. The atomic take makes this safe under repeated effects and React Strict Mode. Never navigate from the provider itself.
5. In the on-screen failed state, **Try Again** calls `retryGeneration()` and resumes the calming state with captured inputs. **Go Back** dismisses the failed lifecycle before navigating back, matching the current route-local error behavior.
6. Add a visible **Leave** control and one shared confirmation function with exactly **Stay**, **Keep Creating**, and **Cancel Story**:

   - **Stay:** close the native `Alert` without changing coordinator or navigation state.
   - **Keep Creating:** call `continueInBackground()` before allowing the pending back action or calling `router.back()`.
   - **Cancel Story:** call `cancelGeneration()` before allowing the pending back action or calling `router.back()`.

7. Use Expo Router's public `useNavigation()` listener for `beforeRemove` while the visible screen is actively generating, preserve the intercepted `event.data.action`, and dispatch that original action only after Keep Creating or Cancel Story. The visible Leave button calls the same confirmation builder. Do not patch router methods or cancel on unmount. Keep any listener callback stable only where required by the effect dependency contract.
8. Returning from global generating status must call `resumeWaiting()` before pushing `/generate`; success after that return is again allowed to auto-open exactly once.

**Verify**

- `npm run test:ci -- --runInBand src/app/__tests__/story-generation-workflow.test.tsx`
- Confirm the workflow proves: inputs and child are captured once; selected-child changes do not relabel work; duplicate entry opens existing work; route remount does not submit; Stay remains; Keep Creating leaves without aborting; Cancel aborts and clears; visible Leave and intercepted Back have equivalent outcomes; waiting success replaces with `/story` exactly once; waiting failure exposes Try Again/Go Back.
- `npm run lint`
- `npm run typecheck`

### Task 3: Add parent-controlled global generating, ready, and failed status

**Outcome:** Home and Vault show an accessible compact status above native tabs only after the parent has left, while completion/failure never interrupts the current route.

**Files / symbols**

- Create: `src/components/story-generation-status.tsx` — `StoryGenerationStatus`
- Modify: `src/components/app-tabs.tsx` — app-level status overlay host around `NativeTabs`
- Modify: `src/app/__tests__/story-generation-workflow.test.tsx` — background success/failure/status coverage
- Test as needed: `src/components/__tests__/story-generation-status.test.tsx` — focused accessibility/layout behavior only if the workflow harness cannot observe it without testing internals

**Dependencies:** Tasks 1 and 2, especially `hasLeftGenerationScreen`, `resumeWaiting`, `takeReadyStory`, `retryGeneration`, and `dismissStatus`.

**Implementation**

1. Expand the workflow suite before production UI. Prove that background success/failure does not call `replace`, current-route actions remain parent-controlled, and status survives a `/story` route suppression round trip.
2. Host the status as a normal React Native sibling/overlay around `AppTabs`, positioned just above the existing `BottomTabInset`. Use `pointerEvents="box-none"` on the overlay host, existing dark theme tokens, `MaxContentWidth`, `Layout.minTouchTarget`, `PressableFeedback`, `Button`, and an indeterminate `ActivityIndicator`. Do not use the platform-limited native-tabs accessory or introduce a portal library.
3. Render only when all are true:

   - the lifecycle is non-idle;
   - the generation screen has been explicitly left;
   - the current pathname is an ordinary Home or Vault route.

   This explicit route allowlist hides status on `/generate`, `/story`, and any future focused route by default. Underlying lifecycle state must remain intact while hidden.
4. Use captured-name copy with neutral fallback:

   - generating: `Writing <name>'s story…` plus a labeled indeterminate indicator; tapping calls `resumeWaiting()` then pushes `/generate` without starting work;
   - ready: `<name>'s story is ready` plus **Listen** and **Dismiss**; Listen atomically takes the story then pushes `/story`, while Dismiss clears only session status;
   - failed: `We couldn't finish <name>'s story.` plus **Try Again** and **Dismiss**; Try Again reuses the snapshot and remains backgrounded, while Dismiss clears the status.

5. Make every surface/action expose a meaningful accessibility role and label, maintain at least the existing 44-point touch target, and announce semantic transitions politely once. Use `accessibilityLiveRegion="polite"` where supported and an `AccessibilityInfo.announceForAccessibility` transition effect only where needed for iOS; key it by status/request token so normal rerenders do not repeat announcements.
6. Do not introduce completion haptics or audio. Successful persistence must still seed/invalidate queries even if the status is hidden during `/story`, and leaving playback must reveal the unchanged status again on Home/Vault.

**Verify**

- `npm run test:ci -- --runInBand src/app/__tests__/story-generation-workflow.test.tsx src/components/__tests__/story-generation-status.test.tsx`
- If the optional focused component test file is not needed, omit its path from the command rather than creating a structural test.
- Confirm tests cover generating tap-to-return, background ready without redirect, Listen once, ready dismissal without deletion, background failed retry/dismiss, captured child copy, query refresh, status hidden during all `/story` states, and one-time accessibility announcements.
- `npm run lint`
- `npm run typecheck`

### Task 4: Validate regressions and device navigation behavior

**Outcome:** Existing generation success, Vault discovery, story playback, and both platforms' back behavior remain correct with no unsupported reliability claim.

**Files / symbols**

- Modify only if a real regression is found: tests or implementation files from Tasks 1-3; do not broaden scope or suppress failures.

**Dependencies:** Tasks 1-3 complete.

**Implementation**

1. Run the complete client test suite, lint, and typecheck. If an existing test assumed route-local `useMutation` or query behavior, update it to assert the approved public workflow rather than preserving obsolete internals.
2. Perform an iOS and Android manual pass because native-stack removal interception, system gestures/hardware Back, native `Alert` button ordering, safe-area/tab positioning, and touch targets are not fully represented by Jest.
3. During the manual pass verify:

   - visible Leave and Android hardware/iOS back gesture show the same three choices;
   - Keep Creating returns to the correct previous Home/Vault stack and the request continues;
   - changing the selected child does not change status copy or result ownership;
   - repeated entry/cancel taps never start or cancel a later request;
   - background completion does not redirect, and Listen opens the returned story;
   - Vault and Home recent story refresh after success;
   - status is absent throughout story playback/post-story phases and returns afterward if unresolved;
   - force-quitting loses in-memory status without any recovery claim, while an already-persisted result can still appear after a later Vault refresh.
4. Review all parent-facing cancellation and failure copy to ensure it is generic and does not promise that server work stopped or persisted data was deleted.

**Verify**

- `npm run test:ci -- --runInBand`
- `npm run lint`
- `npm run typecheck`
- `git diff --check`
- Record iOS and Android manual results in the implementation handoff; if native back interception is inconsistent, stop and report the platform/evidence rather than adding a router monkey patch.

## Execution Handoff

Use inline execution for Tasks 1-3 because the coordinator contract, route intent, and global status behavior are tightly coupled and each slice extends the same workflow suite. After implementation, use a fresh focused review agent before Task 4's final handoff; independent review is valuable for cancellation races, stale settlements, and accidental navigation, while parallel implementation would increase interface churn.

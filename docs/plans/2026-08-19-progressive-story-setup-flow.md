# Progressive Story Setup Flow Implementation Plan

**Goal:** Replace Home's expanding challenge form with a focused, accessible `Home → Create → Generate → Story` flow that reaches generation in three intentional taps and scales with additional choices.

**Design:** [2026-08-19-story-setup-flow-design.md](../specs/2026-08-19-story-setup-flow-design.md)

**Confidence:** High. The approved design maps directly to the current `StoryGenerationContext` snapshot and `startGeneration` result contract, the nested Stack already owns `/generate` and `/story`, and Expo Router supports per-screen native stack headers plus `push`/`replace` history semantics. Native Tabs already provide platform-managed bottom insets, so Home can remove its legacy fixed tab padding while preserving the direct scroll-surface requirement.

**Constraints:**

- This is React Native UI built from the existing primitives; do not introduce `@expo/ui`, a new UI library, a sheet, or a custom navigation abstraction.
- Preserve `/generate` as the focused generation-progress route. Add `/create` for setup; do not overload or rename the current generation screen.
- `router.push('/create')` starts setup. After a successful terminal trigger selection, use `router.replace('/generate')` so Home—not a stale Create form—remains beneath generation in the stack.
- Preserve `StoryGenerationContext` as the sole one-active-request boundary. Never duplicate its request, snapshot, background-status, retry, cancellation, or ready-state logic.
- The native stack header is enabled only for Create. Keep its back affordance framework-managed; do not add a custom icon-only header button.
- Native back from the trigger step must return to categories without starting a request. Since a terminal `replace` also removes Create, use the same explicit one-removal guard pattern already used by `GenerateScreen` so the `beforeRemove` listener does not block the terminal handoff.
- Update `DESIGN.md` YAML and `src/theme/*` together. Resolve the documented 40px chip / 44pt target conflict by making `Layout.chipHeight` and the YAML chip height 44, and make `Chip` consume the shared token rather than a literal.
- Never hardcode colour, spacing, radius, typography, or touch-target values. Do not add lint/type suppressions. With React Compiler enabled, do not add `useMemo`; use `useCallback` only if an effect/listener genuinely needs stable identity.
- Use platform-native press feedback only. Remove `ChallengeMatrix`'s `FadeInDown`/`FadeOut` entry animations rather than carrying them into the new flow.
- Keep the first Home `ScrollView` discoverable by Native Tabs: use a direct scroll descendant (or a `collapsable={false}` wrapper), no manual fixed bottom-tab inset, platform-managed iOS content adjustment, and Android top inset handling.
- Run `npm run lint` and `npm run typecheck` after every code-changing task and fix all introduced errors before continuing.

### Task 1: Align the selection primitives and documented touch-target contract

**Outcome:** Category rows and trigger chips have accessible, framework-native interaction contracts, and the 44pt chip target is represented consistently in the theme and design document.

**Files / symbols**

- Modify: `DESIGN.md` — YAML `components.chip.height`, route-flow overview, layout/component guidance, and the new selectable-row pattern
- Modify: `src/theme/layout.ts` — `Layout.chipHeight`
- Modify: `src/ui/chip.tsx` — `Chip` base height uses `Layout.chipHeight`
- Modify: `src/ui/card.tsx` — opt-in pressable accessibility/test props for interactive cards
- Create: `src/ui/selection-row.tsx` — `SelectionRow`
- Create: `src/ui/__tests__/selection-row.test.tsx` — static-versus-pressable and accessibility coverage

**Implementation**

1. Change the YAML chip height in `DESIGN.md` and `Layout.chipHeight` from 40 to 44. Keep the existing chip radius, neutral surface/border tokens, and pill role. In `Chip`, replace the literal `minHeight: 40` with `minHeight: Layout.chipHeight`; do not create a second height token.
2. Update `DESIGN.md` in the same task:
   - replace the obsolete app shape with `Home → Create Story → Generate → Story`;
   - describe Home as a calm landing surface with one full-width primary creation action;
   - document progressive category-then-trigger disclosure and terminal trigger selection;
   - define a full-width selectable row for expandable single-choice lists; and
   - retain category accents only for active challenge context, not page/card/button decoration.
3. Extend `Card` without changing its static contract. Its existing `onPress` remains the only switch that creates `PressableFeedback`; when no `onPress` is supplied it must remain a plain `View`. Add a narrowly typed optional group of `PressableProps` fields needed by consumers of an interactive card: `accessibilityLabel`, `accessibilityHint`, `accessibilityRole`, `accessibilityState`, `disabled`, and `testID`. Pass them only to the internal `PressableFeedback` branch.
4. Add `SelectionRow` in `src/ui/`, using `Card` rather than duplicating card shell or press-feedback styles. Its explicit API is:

   ```ts
   type SelectionRowProps = {
     label: string;
     onPress: () => void;
     accessibilityHint?: string;
     testID?: string;
   };
   ```

   Render the label with an existing body-size theme preset and tokenized medium weight. Set `accessibilityRole="button"`, use the visible label as its accessible name, and lay content out left-aligned with the existing card padding. Do not add a chevron, emoji, selection checkmark, or category-colour fill to this generic primitive.
5. Add focused component coverage before or alongside the primitive:
   - static `Card` does not expose a pressable accessibility role;
   - `SelectionRow` exposes its label and button semantics, invokes its handler once, and forwards its optional hint/test id;
   - interactive `Chip` has the resolved 44pt minimum height through the shared theme token.
6. Run `npm run lint` and `npm run typecheck`; fix all new errors before Task 2.

**Verify**

- `npm run test:ci -- --runInBand src/ui/__tests__/selection-row.test.tsx`
- `npm run lint`
- `npm run typecheck`
- Inspect `DESIGN.md`, `src/theme/layout.ts`, and `src/ui/chip.tsx` together: every documented chip-height value is 44 and no local literal reintroduces 40.

### Task 2: Build the Create route and simplify the Home entry surface

**Outcome:** Parents enter a focused category/trigger flow from Home, with correct native-stack, safe-area, back, and generation-handoff behavior.

**Files / symbols**

- Create: `src/app/(index,vault)/create.tsx` — `CreateStoryScreen`
- Modify: `src/app/(index,vault)/_layout.tsx` — static `create` stack-screen configuration
- Modify: `src/app/(index,vault)/index.tsx` — `HomeScreen` setup entry, Native Tabs scroll layout, and removal of matrix ownership
- Delete: `src/components/challenge-matrix.tsx`
- Modify: `src/components/app-tabs.tsx` — keep Home and Vault tab bars opaque at the scroll edge
- Create: `src/app/__tests__/create-story-screen.test.tsx` — Create behavior and lifecycle handoff
- Modify: `src/app/__tests__/home-screen.test.tsx` — Home CTA, active-generation redirect, and safe-area test harness

**Dependencies:** Task 1 is complete; `SelectionRow` and 44pt `Chip` are available.

**Implementation**

1. Add `create.tsx` under the existing `(index,vault)` group. The screen holds only `selectedCategory: ChallengeCategory | null` in route-local state. Derive visible categories from `CHALLENGE_CATEGORIES` by retaining only categories with at least one matching `CHALLENGE_TRIGGERS` entry; derive the current triggers from the same typed arrays during render. Do not use `useMemo`, duplicated data, route parameters, persistence, or new context state.
2. Render two exclusive screen states inside a tokenized, scrollable single-column surface:
   - **Category state:** contextual child copy (`A story for {name}`), `What needs a story tonight?`, and `SelectionRow` controls.
   - **Trigger state:** the same child context, a static category `Chip`, `What happened?`, and the matching pressable trigger chips. Keep the trigger surface scrollable for future counts and label growth. If a future label does not fit a useful chip, use `SelectionRow` for that trigger without changing the state or handoff contract.

   Do not render the `ChallengeCategoryInfo.emoji` field, a progress bar, a final Create button, category-grid layout, directional entry animation, or a second primary CTA.
3. Use the standard Expo Router stack header for Create. In `_layout.tsx`, add a static `<Stack.Screen name="create" ... />` with `headerShown: true`, title `Create a story`, `bgBase` header background, `textPrimary` header tint/title colour, and `headerShadowVisible: false`. The rest of the grouped stack remains headerless. Do not supply `headerLeft`; the native back affordance must stay intact.
4. Handle Create back navigation with `useNavigation().addListener('beforeRemove', ...)` while a category is selected. For a parent-initiated removal, call `event.preventDefault()` and clear the selected category so the category state reappears. Keep an `allowNextRemovalRef` that is set immediately before the terminal route replacement; when it is set, the listener resets it and allows that removal. This preserves native header, gesture, and Android-system back semantics without a custom back button or a stale form below generation.
5. On a trigger press, safely read the selected profile. If it is unavailable, do nothing; Home should not offer this route without a selected profile. Otherwise build the existing `StoryGenerationSnapshot` from the profile, selected category, and trigger. Call `startGeneration(snapshot)` exactly once:
   - `{ status: 'started' }`: set `allowNextRemovalRef`, then `router.replace('/generate')`.
   - `{ status: 'already-generating' }`: call `resumeWaiting()`, set `allowNextRemovalRef`, then `router.replace('/generate')`; never start or display a second setup flow.
6. Simplify Home:
   - remove `ChallengeMatrix`, direct `startGeneration` calls, challenge type imports, and `Or make a new one`;
   - add one full-width existing `Button` labelled `Create Tonight's Story` below contextual/recent-story content;
   - if `state.status === 'generating'`, call `resumeWaiting()` and push `/generate`; otherwise push `/create`.
7. Make Home's tab-scroll structure idiomatic for Native Tabs. Remove `BottomTabInset` from imports and content padding. Make the scroll view the first scrollable descendant (mark any necessary wrapper `collapsable={false}`), use the framework-managed iOS scroll inset behavior, and use `useSafeAreaInsets()` only to add Android's top inset. Do not add a fixed substitute tab inset. Use existing spacing tokens for final vertical breathing room.
8. Apply `disableTransparentOnScrollEdge` to the Home and Vault `NativeTabs.Trigger`s. This preserves the design-system `bgBase` tab-bar surface on iOS scroll edges instead of allowing the platform's transparent scroll-edge treatment to create a lightness/seam regression.
9. Delete `ChallengeMatrix` only after Home and Create no longer import it. Do not leave a compatibility export.
10. Refresh Expo Router's generated route types through the project route-generation path (run `npx expo start --offline` long enough to update `.expo/types/router.d.ts`, then stop it). Do not hand-edit generated route types.
11. Add and update focused tests:
    - wrap Home test rendering in `SafeAreaProvider` with `initialMetrics`, as done by Vault tests;
    - assert the Home CTA routes idle parents to `/create`, keeps recent-story replay working, hides matrix content, and routes an active generation to `/generate` after resuming waiting;
    - render Create with mocked selected child/generation context and assert category labels, child context, and matching triggers only;
    - press a category then a trigger and assert the exact generation snapshot plus `router.replace('/generate')`;
    - simulate the `beforeRemove` listener: normal native back clears trigger state and prevents the removal; terminal replacement is allowed by the guard;
    - assert a missing profile cannot issue a request and an `already-generating` result does not create a second request.
12. Run `npm run lint` and `npm run typecheck`; fix all new errors before Task 3.

**Verify**

- `npm run test:ci -- --runInBand src/app/__tests__/home-screen.test.tsx src/app/__tests__/create-story-screen.test.tsx`
- `npm run lint`
- `npm run typecheck`
- `rg -n "ChallengeMatrix|challenge-matrix|BottomTabInset" src` shows no Home/matrix remnants; any remaining `BottomTabInset` use is outside this Home-flow scope and must be reviewed rather than changed incidentally.
- Confirm generated route types accept `/create` and do not manually alter `.expo/types/router.d.ts`.

### Task 3: Migrate lifecycle coverage and validate the complete navigation contract

**Outcome:** The existing generation lifecycle remains protected after setup moves out of Home, and the final flow is verified across accessible, Native Tabs, and device-specific behavior.

**Files / symbols**

- Modify: `src/app/__tests__/story-generation-workflow.test.tsx` — decouple lifecycle tests from the removed Home matrix and retain generation-status assertions
- Modify only if a generated type update requires it: `.expo/types/router.d.ts` — generated by Expo, never edited manually

**Dependencies:** Tasks 1–2 are complete and all focused setup tests pass.

**Implementation**

1. Remove the obsolete `ChallengeMatrix` test mock and the assumption that Home itself passes category/trigger values into `startGeneration`.
2. Replace that test entry point with a local test harness that invokes `useStoryGeneration().startGeneration()` using the existing representative `StoryGenerationSnapshot`. Keep the lifecycle suite focused on its true contract: one request, route-mount observation, Leave/Keep Creating/Cancel, ready status, retry, dismissal, and story-playback suppression.
3. Retain one integration assertion that the real Create screen owns the selection-to-snapshot path; do not duplicate every picker behavior in the lifecycle suite.
4. Update route mocks to include `router.replace` assertions where the new Create flow uses replacement. Preserve the existing `beforeRemove` mock behavior so tests prove both Create's local-step interception and Generate's leave-confirmation interception independently.
5. Run focused suites and then the full client test suite. Address test-hygiene issues with proper unmounting/query-client clearing rather than timer or lint suppressions.
6. Perform a manual native pass on a compact iPhone and an Android device/emulator:
   - Home has one obvious creation action; a recent story remains secondary.
   - iOS Home/Vault tab bars retain the `bgBase` surface at the scroll edge; Android content clears the status area and tab bar without duplicated fixed padding.
   - The standard Create header/back action, Android system back, and iOS back gesture return trigger state to categories; terminal selection moves to the existing Generate screen.
   - Category rows and trigger chips are reachable one-handed, wrap safely, meet 44pt targets, use no decorative emoji, and retain contrast in the dark theme.
   - VoiceOver/TalkBack announces category/trigger labels and trigger-step context. With reduced motion enabled, no directional/staggered picker animation appears.
   - Leave, Keep Creating, cancellation, failure, retry, ready, and Listen still have their established behavior after the Create handoff.
7. Run `npm run lint` and `npm run typecheck` after any code change made while resolving verification findings.

**Verify**

- `npm run test:ci -- --runInBand src/app/__tests__/create-story-screen.test.tsx src/app/__tests__/home-screen.test.tsx src/app/__tests__/story-generation-workflow.test.tsx`
- `npm run test:ci -- --runInBand`
- `npm run lint`
- `npm run typecheck`
- `git -c core.fsmonitor=false diff --check`

## Execution Handoff

Recommend **inline execution with a fresh focused code review afterward**. The route, local back interception, shared generation lifecycle, accessibility primitive, Native Tabs insets, and related tests are tightly coupled; splitting them would introduce temporary navigation/test breakage and duplicate context reconstruction. The work should remain one coherent, reviewed implementation rather than parallel subprojects.

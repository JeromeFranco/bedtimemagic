# Native Screen Chrome Implementation Plan

**Goal:** Add a tokenized edge-to-edge status-bar scrim and consistent circular controls in Expo Router native headers, including the immersive story player.

**Design:** [2026-08-19-native-screen-chrome-design.md](../specs/2026-08-19-native-screen-chrome-design.md)

**Confidence:** High. The current grouped `Stack` already owns Create, Generate, and Story; its installed Expo Router native-stack contract supports transparent headers plus `headerLeft`/`headerRight`. Home and Vault already use safe-area-aware scroll surfaces. Story and Generate have focused route tests that model their `beforeRemove` lifecycle guards. The only implementation-specific limitation is that this resolved Expo Router package vendors React Navigation and does not publicly export `useHeaderHeight`; the plan avoids its internal module paths and uses a small, token-composed inset helper with required device validation.

**Constraints:**

- Keep Expo Router's native Stack header. Do not use the `header` replacement option, a JavaScript stack, an internal `expo-router/build/*` import, or a custom navigation abstraction.
- Install and use the Expo SDK-matched `expo-linear-gradient` package. Do not simulate the fade with manually layered translucent Views or a custom native module.
- `StatusBarScrim` is fixed, decorative, non-interactive, and screen-owned; never mount a root overlay above `AppTabs`.
- The gradient exception is exclusively for this system-bar scrim. Update `DESIGN.md` and `src/theme/*` together; page/card/player backgrounds remain solid.
- Preserve existing route history, `beforeRemove` behavior, story playback cleanup, wind-down behavior, Native Tabs behavior, and React Compiler rules. Do not add lint suppressions or test-only behavior.
- Run `npm run lint` and `npm run typecheck` after every code-changing task, fixing all newly introduced errors before proceeding.

### Task 1: Establish the tokenized screen-chrome foundation

**Outcome:** A reusable, accessible system-bar scrim and a single public-API-safe top-chrome measurement convention are available before any route changes.

**Files / symbols**

- Modify: `package.json`, `package-lock.json` — add the SDK-compatible `expo-linear-gradient` dependency via Expo.
- Modify: `src/theme/colors.ts` — named opaque/transparent system-bar scrim stop tokens.
- Modify: `DESIGN.md` — YAML token entries and the narrow system-bar gradient exception.
- Create: `src/components/ui/status-bar-scrim.tsx` — `StatusBarScrim`.
- Create: `src/components/ui/use-top-chrome-inset.ts` — `useTopChromeInset` (or equivalent narrowly named hook).
- Create: `src/components/ui/__tests__/status-bar-scrim.test.tsx` — component/hook contract.

**Dependencies:** None.

**Implementation**

1. Run `npx expo install expo-linear-gradient`, accepting only the version selected for the installed Expo SDK. Commit the resulting `package.json` and lockfile change; do not hand-select a package version.
2. Add exactly two semantic color tokens representing the fixed scrim's opaque top and transparent bottom. Base both on the existing `bgDeepest` color; do not introduce a new palette, opacity literal in route code, or an app-wide gradient token.
3. Update `DESIGN.md` YAML with the same token names and values. Change its no-gradient rule to say that backgrounds remain solid and the fixed system-bar readability scrim is the sole permitted vertical gradient. Record that it is system chrome, not decoration.
4. Implement `StatusBarScrim` with `expo-linear-gradient`, the new tokens, `StyleSheet.absoluteFill`-style placement constrained by an explicit `height` prop, `pointerEvents="none"`, and no accessibility role. It accepts a measured top-chrome height and applies only existing spacing tokens for the fade below that height.
5. Implement one local `useTopChromeInset({ hasNativeHeader: boolean })` helper. It combines `useSafeAreaInsets()` with existing layout/spacing tokens to return:
   - the status-bar scrim height for a headerless tab root; and
   - the status bar plus platform-native standard header height for a transparent-header route.

   Compose the standard header height from existing tokens (`Layout.minTouchTarget` and, where Android needs it, existing vertical spacing) rather than introducing a raw 44/56 literal. Keep the platform branch inside this helper. Do not import `useHeaderHeight` or `HeaderHeightContext` from Expo Router's non-public `build/` paths; they are not application APIs in this installation.
6. Test the component as a presentation contract: it uses the named color tokens, is non-interactive, accepts the calculated height, and adds no accessible content. Test the helper under supplied safe-area metrics for iOS and Android expectations. Avoid visual snapshots.
7. Run lint and typecheck before Task 2.

**Verify**

- `npx expo install expo-linear-gradient` updates the SDK-compatible dependency and lockfile.
- `npm run test:ci -- --runInBand src/components/ui/__tests__/status-bar-scrim.test.tsx`
- `npm run lint`
- `npm run typecheck`
- Read `DESIGN.md` and `src/theme/colors.ts` together: the two token names/values and the narrow gradient exception agree exactly.

### Task 2: Apply screen chrome to the tab-root scroll surfaces

**Outcome:** Home and Vault gain the fixed status-bar readability scrim without changing their headerless Native Tabs structure, content hierarchy, list behavior, or navigation actions.

**Files / symbols**

- Modify: `src/app/(index,vault)/index.tsx` — `HomeScreen` root chrome and scroll inset use.
- Modify: `src/app/(index,vault)/vault.tsx` — `VaultScreen` root chrome and list inset use.
- Modify: `src/app/__tests__/home-screen.test.tsx` — safe-area/scrim integration assertions.
- Modify: `src/app/__tests__/vault.test.tsx` — safe-area/scrim/list regression assertions.

**Dependencies:** Task 1 is complete.

**Implementation**

1. Render `StatusBarScrim` inside each screen's own root view, above the scroll/list content visually but after it in the React tree if necessary for stacking. It must be `pointerEvents="none"` and must not alter tab ownership.
2. Use `useTopChromeInset({ hasNativeHeader: false })` to size Home and Vault scrims. Retain the existing `contentInsetAdjustmentBehavior="automatic"` for iOS and existing Android safe-area treatment; consolidate the top-padding calculation through the shared helper only where it avoids duplicate status inset logic.
3. Preserve Home's dynamic headline, profile selector, recent-story replay, and Create CTA exactly as currently implemented. Do not add a Stack title or a fake back action.
4. Preserve Vault's `FlatList`, `ListHeaderComponent`, refresh control, loading/error/empty states, selected-story navigation, and opaque Native Tabs scroll-edge behavior. Do not replace it with a ScrollView or add a header action.
5. Extend existing test render harnesses with safe-area metrics as needed. Assert the scrim is present/non-interactive and Home/Vault retain their current observable behaviors; retain the Vault automatic-inset and pull-to-refresh tests.
6. Run lint and typecheck before Task 3.

**Verify**

- `npm run test:ci -- --runInBand src/app/__tests__/home-screen.test.tsx src/app/__tests__/vault.test.tsx`
- `npm run lint`
- `npm run typecheck`
- Inspect Home/Vault source: neither supplies Stack header options or a navigation icon; both use the shared scrim rather than local gradient/color code.

### Task 3: Introduce native transparent headers and circular header actions

**Outcome:** Create, Generate, and Story share Expo Router native transparent-header styling and use circular header items without replacing native navigation layout.

**Files / symbols**

- Modify: `src/app/(index,vault)/_layout.tsx` — transparent-header defaults and static Create registration.
- Create: `src/components/ui/native-header-icon-button.tsx` — shared circular native-header item adapter.
- Modify: `src/app/(index,vault)/create.tsx` — native-header top inset and shared scrim.
- Modify: `src/app/(index,vault)/generate.tsx` — dynamic native-header Back behavior, scrim, and removal of duplicate Leave UI.
- Modify: `src/app/__tests__/create-story-screen.test.tsx` — header-aware Create regression coverage.
- Modify: `src/app/__tests__/story-generation-workflow.test.tsx` — native header Back/failed-return coverage.

**Dependencies:** Tasks 1–2 are complete.

**Implementation**

1. Add `NativeHeaderIconButton`, a minimal adapter around the existing `IconButton` and `SymbolView`. Its public props are the action (`back` or `sleep`), `onPress`, accessible label, and optional test id. It supplies the existing platform symbol mapping and retains 44pt circular, filled, platform-feedback behavior. It must not render a header container or accept arbitrary styling.
2. In the grouped Stack layout, define the shared options for Create, Generate, and Story: `headerShown`, `headerTransparent`, no shadow, dark-compatible light tint/title styling, and stock-back visibility disabled when an explicit circular Back item is supplied. Keep Home and Vault headerless.
3. Configure Create's circular left item in its Stack registration. It invokes `router.back()` so the existing Create `beforeRemove` listener remains the sole authority for category-step back behavior. Keep the Create title and selection state contract unchanged.
4. Update Create's scroll surface to render the shared scrim with `useTopChromeInset({ hasNativeHeader: true })` and reserve that same inset before the first content. Keep `contentInsetAdjustmentBehavior="automatic"`; ensure the final layout has one effective top offset on iOS and Android, not cumulative status/header padding. Existing category-to-trigger and terminal replacement behavior must not change.
5. Move Generate's Back behavior into a per-screen `<Stack.Screen options={...} />` configuration so it can depend on current generation state:
   - while generating, the circular Back invokes `router.back()`, allowing the existing `beforeRemove` confirmation listener to intercept it;
   - while failed, the circular Back calls `dismissStatus()` then returns through the router, matching the existing **Go Back** behavior;
   - while idle/ready transition states, keep the current route replacement/redirect semantics.

   Render the shared scrim and native-header top inset in both the main and failure layouts. Remove the inline **Leave** and failure **Go Back** controls only after their equivalent header action is covered by tests. Retain **Try Again**.
6. Update all focused Jest mocks of `expo-router` that render affected routes to include a lightweight `Stack.Screen` test component, ensuring tests inspect options/actions without depending on native header rendering. Add tests for Create's circular Back dispatching `router.back()` and Generate's generating/failed header actions. Preserve existing `beforeRemove` assertions rather than mocking around them.
7. Run lint and typecheck before Task 4.

**Verify**

- `npm run test:ci -- --runInBand src/app/__tests__/create-story-screen.test.tsx src/app/__tests__/story-generation-workflow.test.tsx`
- `npm run lint`
- `npm run typecheck`
- Search route code for `header:` and confirm none is provided; only `headerLeft`/`headerRight` option slots are used.

### Task 4: Migrate Story controls into the native header without changing playback lifecycle

**Outcome:** Story remains immersive under a transparent native header; its local top bar is gone, and the native circular Back/Sleep controls preserve ordinary playback and wind-down semantics.

**Files / symbols**

- Modify: `src/app/(index,vault)/story.tsx` — dynamic Story Stack options, title, header actions, screen scrim, and top inset.
- Modify: `src/components/story/story-player.tsx` — remove the local top bar and receive layout-only top inset.
- Modify: `src/app/__tests__/story.test.tsx` — route-level native header actions, title, and lifecycle coverage.
- Modify: `src/components/story/__tests__/story-player.test.tsx` — remove local top-bar expectations while retaining player/body behavior coverage.

**Dependencies:** Task 3 is complete.

**Implementation**

1. In `StoryScreen`, read the existing player state needed for native header configuration: post-story phase, sleep-mode state, sleep toggle, stop, and finish-wind-down. Retain the existing route-level `beforeRemove`, cleanup, cover-cache, audio-prefetch, and done-route effects.
2. Define Story's `<Stack.Screen options={...} />` from the route. Its title is the loaded story title and has a safe fallback during loading/error. Its left item calls the current route-level ordinary-Back handler. Its right item is the circular Sleep Mode action only while `postStoryPhase === 'idle'`; it disappears in fading, Pillow Talk, affirmation, terminal fade, and done states. Do not use a custom `header` option.
3. Remove `StoryPlayer`'s `topBar`, local Back handler, local Back/Sleep icon buttons, and `SafeAreaView` top edge. Remove its `onBack` prop. Keep bottom safe-area behavior, artwork sizing, body controls, artwork/error behavior, all Reanimated `.get()`/`.set()` access, and post-story actions unchanged.
4. Pass a layout-only top inset from `StoryScreen` to `StoryPlayer`, calculated by `useTopChromeInset({ hasNativeHeader: true })`, so artwork/content begins below the native header. The Story route also renders `StatusBarScrim` around loading, error, and loaded states. Do not make `StoryPlayer` responsible for navigation or system-bar policy.
5. Move the story title from the player body to the native header. Preserve the centered protagonist/moral metadata below the artwork; do not duplicate the title. Confirm long titles truncate in native header instead of overlapping header items.
6. Update tests:
   - route-level Back stops ordinary playback and returns; post-story Back uses finish-wind-down through the existing listener/handler;
   - header right Sleep Mode calls the same context action only in idle playback;
   - `fade_to_black` does not expose an actionable Sleep or Back escape;
   - player tests no longer query `player-back-button`/`sleep-mode-button`, but retain play/pause/seek, error, artwork, narration, accessibility announcements, wind-down, terminal curtain, and reduced-motion assertions.
7. Run lint and typecheck before final validation.

**Verify**

- `npm run test:ci -- --runInBand src/app/__tests__/story.test.tsx src/components/story/__tests__/story-player.test.tsx`
- `npm run lint`
- `npm run typecheck`
- `rg -n "topBar|player-back-button|sleep-mode-button|onBack" src/components/story src/app/(index,vault)/story.tsx` confirms only intentional test/history references remain.

### Task 5: Run regression validation and perform the required device pass

**Outcome:** The change is validated against the approved behavior and physical system-chrome geometry, with no accidental design-system or lifecycle regression.

**Files / symbols**

- Modify only if validation exposes a real defect: affected production/test files from Tasks 1–4.
- Do not modify generated Expo Router types manually.

**Dependencies:** Tasks 1–4 are complete.

**Implementation**

1. Run the focused suites, then the full client suite. Fix failures at their product boundary; do not weaken tests, add timing sleeps, suppress warnings, or bypass navigation listeners.
2. Run `npm run lint`, `npm run typecheck`, and `git -c core.fsmonitor=false diff --check` after the final code change.
3. Perform a compact Android and iPhone simulator/device pass. Check every route at rest and while scrolling where relevant:
   - Home and Vault light status icons remain readable without a hard fade edge, seam, or touch interception.
   - Create content starts below its transparent header; native header Back, Android system Back, and iOS gesture preserve category/trigger-step behavior.
   - Generate header Back opens the existing Keep Creating/Cancel confirmation; failed-state Back dismisses then returns; retry remains reachable.
   - Story header controls stay centered, title truncates safely, sleep mode appears only during idle playback, and Back preserves ordinary stop versus wind-down finish behavior.
   - Pull-to-refresh, Native Tabs, bottom system gestures, theme contrast, and compact-screen reachability remain correct.
4. Record device findings separately from automated results. Do not claim simulator/device geometry or perceived fade quality from Jest output.

**Verify**

- `npm run test:ci -- --runInBand src/components/ui/__tests__/status-bar-scrim.test.tsx src/app/__tests__/home-screen.test.tsx src/app/__tests__/vault.test.tsx src/app/__tests__/create-story-screen.test.tsx src/app/__tests__/story-generation-workflow.test.tsx src/app/__tests__/story.test.tsx src/components/story/__tests__/story-player.test.tsx`
- `npm run test:ci -- --runInBand`
- `npm run lint`
- `npm run typecheck`
- `git -c core.fsmonitor=false diff --check`
- Manual iOS and Android acceptance pass, with any physical-device limitation reported explicitly.

## Execution Handoff

Recommend **inline execution followed by a fresh focused code review**. The shared inset contract, transparent native-header options, route-specific back behavior, Story player migration, and test mocks are tightly coupled; splitting implementation would create temporary lifecycle and navigation inconsistencies. A final independent review should specifically inspect native-header ownership, no internal Expo Router imports, duplicated insets, React Compiler compliance, and Story/Generate back semantics.

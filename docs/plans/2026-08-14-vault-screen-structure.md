# Vault Screen Structure Implementation Plan

**Goal:** Make the story archive a route-consistent Vault screen with an idiomatic Native Tabs-aware React Native list layout and complete, recoverable query states.

**Confidence:** High. The current screen has three separate full-screen render branches, duplicates list/header layout responsibility, uses a fixed tab inset despite Native Tabs owning the bottom content area, and has no focused screen test. The installed Expo Router Native Tabs guidance explicitly handles the bottom inset on Android and automatic scroll content insets on iOS, while requiring top insets to be handled by the screen on Android.

**Constraints:**

- Treat the approved `explore` to `vault` change as a route migration: `/vault` becomes the canonical public path. Do not leave a duplicate `/explore` route or a redirect without a separate compatibility requirement.
- Preserve the user's existing uncommitted changes in `src/app/(index,explore)/explore.tsx` while performing the move; inspect and carry them forward rather than replacing the file from an older baseline.
- Use React Native `FlatList`, `RefreshControl`, `StyleSheet`, and existing themed/Button components. Do not introduce a new UI package or a custom list abstraction.
- Keep the list as the main scroll surface. With Native Tabs, do not retain the approximate `BottomTabInset` padding; Native Tabs owns its bottom safe-area/tab-bar behavior.
- Follow React Compiler conventions: do not add `useMemo`; use `useCallback` only if a stable identity is required by an effect/listener. Do not add lint or TypeScript suppressions.
- After every code-changing task, run `npm run lint` and `npm run typecheck` and fix all errors before progressing.

### Task 1: Migrate the Explore route and tab identity to Vault

**Outcome:** The archive has a coherent route, route group, component name, tab trigger, and generation-status allowlist: `/vault` and “Vault” refer to the same screen everywhere.

**Files / symbols**

- Rename directory: `src/app/(index,explore)/` to `src/app/(index,vault)/`
- Rename: `src/app/(index,vault)/explore.tsx` to `src/app/(index,vault)/vault.tsx`
- Modify: `src/app/(index,vault)/_layout.tsx` — `unstable_settings` Vault anchor and the active-tab selection contract
- Modify: `src/components/app-tabs.tsx` — `NativeTabs.Trigger` route name
- Modify: `src/components/story-generation-status.tsx` — ordinary tab pathname allowlist
- Regenerate/verify: `.expo/types/router.d.ts` through the project’s Expo route-type generation; do not hand-edit generated types

**Implementation**

1. Start by recording the current dirty diff of the existing Explore screen. Move that working version with the route instead of dropping or overwriting user changes.
2. Rename the array route group from `(index,explore)` to `(index,vault)` and its tab screen file from `explore.tsx` to `vault.tsx`. This keeps the grouped Home/Vault stack pattern intact while changing the canonical URL from `/explore` to `/vault`.
3. Update the nested layout’s `unstable_settings` so the virtual Vault group uses the `vault` anchor, and change the Native Tabs trigger from `(explore)` to `(vault)`.
4. Rename the default component to `VaultScreen`. Keep “Vault” as the native-tab label; Task 2 owns the visible screen copy “Your stories.”
5. Change the global story-generation status route allowlist from `/explore` to `/vault`, so background generation remains visible on the renamed ordinary tab and is still suppressed on focused routes such as `/generate` and `/story`.
6. Run the Expo route-type generation path used by this repository (or start Expo long enough to refresh `.expo/types/router.d.ts`), then confirm there are no remaining source references to `/(explore)` or `/explore` other than intentional historical documentation.

**Verify**

- `rg -n "\(explore\)|/explore|explore\.tsx" src .expo/types/router.d.ts`
- Confirm generated types expose `/vault` and no longer expose `/explore`.
- `npm run lint`
- `npm run typecheck`

### Task 2: Rebuild Vault as one Native Tabs-aware list surface

**Outcome:** The header, story cards, and every initial query state have one predictable layout and spacing model, while Native Tabs—not a fixed constant—owns bottom content insets.

**Files / symbols**

- Modify: `src/app/(index,vault)/vault.tsx` — `VaultScreen`, list header, list-state renderers, `FlatList` configuration, and styles

**Dependencies:** Task 1 route migration complete.

**Implementation**

1. Use a single persistent background/root container with `collapsable={false}` and one `FlatList` as its first scrollable descendant. This preserves Native Tabs’ iOS scroll-view recognition while retaining a full-width dark background around the max-width content on larger screens.
2. Remove the screen-level `SafeAreaView` and the `BottomTabInset` padding. Read `useSafeAreaInsets()` only to add the top inset on Android, where Native Tabs requires top/side insets to be handled by the screen; rely on Native Tabs’ automatic bottom handling on Android and automatic iOS scroll content adjustment. Keep horizontal margins and max-width behavior in the list’s content styles.
3. Normalize the query result once (`data ?? []`) and render the `FlatList` for every query status. Keep an existing non-empty list visible while `isRefetching`; reserve the centered loading state for the initial pending request with no data.
4. Add `ListHeaderComponent` with the approved hierarchy:
   - title: `Your stories`
   - subtitle: `Stories you’ve made together.`

   Use the same 24px title hierarchy and token-based text colors as Home, rather than retaining the screen-specific 32px heading.
5. Render cards directly from normalized stories. Replace broad container `gap` with `ItemSeparatorComponent` so the card rhythm is explicit and independent of headers, empty states, and list virtualization.
6. Use local, named renderers in this module for the three list states. Do not create separate one-off component files:
   - initial loading: accessible indeterminate activity indicator plus `Loading stories…`;
   - empty: `Create your first story`, `It’ll be here whenever you’re ready to listen again.`, and the existing primary `Create a story` action back to Home;
   - error: a concise failure message and a secondary `Try again` action that invokes React Query’s `refetch`.

   Do not retain the emoji empty state or the prohibited “No stories yet” wording.
7. Add an idiomatic `RefreshControl` wired directly to the query result’s `refetch` and `isRefetching`. Its refreshing indicator must not replace existing cards or initial-state copy.
8. Preserve story-card navigation to `/story` with the story id. Keep callbacks inline unless an actual stable identity requirement appears; React Compiler handles ordinary render expressions.
9. Use the list’s content container for top, horizontal, and final vertical breathing room. Do not use the legacy static tab-height calculation; test the bottom spacing on iOS and Android with the native tab bar visible.

**Verify**

- Inspect on iOS and Android: top content clears the status area, the final card/action remains reachable above the native tab bar, and the native tab remains visually stable at the FlatList scroll edge.
- `npm run lint`
- `npm run typecheck`

### Task 3: Add focused Vault screen coverage

**Outcome:** The route’s user-visible states and actions are protected without testing FlatList or Native Tabs internals.

**Files / symbols**

- Create: `src/app/__tests__/vault.test.tsx` — `VaultScreen` state and navigation coverage
- Modify only if necessary for route mocks: existing test setup/mocks; keep changes minimal and local to this test file where possible

**Dependencies:** Tasks 1 and 2 complete.

**Implementation**

1. Mock `expo-router`, `useStories`, and `getCachedCoverPath` consistently with existing app-screen tests. Import the renamed screen from `../(index,vault)/vault`.
2. Create representative `Story` fixtures and assert the populated state displays the approved header/subtitle and story cards. Press a card and assert `router.push({ pathname: '/story', params: { id } })`.
3. Assert the initial loading state retains the Vault header and displays the indeterminate loading copy.
4. Assert the empty state contains the approved title/copy, contains no emoji-only empty-state affordance, and its CTA calls `router.push('/')`.
5. Assert the error state retains the Vault header and pressing `Try again` calls the mocked query `refetch` once.
6. Assert pull-to-refresh configuration through the exposed refresh control props or an interaction supported by React Native Testing Library; verify it invokes `refetch` and that `isRefetching` is reflected without replacing populated cards.
7. Keep assertions behavioral: do not snapshot implementation styles or assert Native Tabs’ platform-managed insets. Add explicit test IDs only where accessible text/roles cannot distinguish an action.

**Verify**

- `npm run test:ci -- --runInBand src/app/__tests__/vault.test.tsx`
- `npm run lint`
- `npm run typecheck`

### Task 4: Validate the renamed route across navigation surfaces

**Outcome:** Vault remains a normal tab destination and a valid generation-status host after route migration.

**Files / symbols**

- Modify: `src/app/__tests__/story-generation-workflow.test.tsx` only if its route fixture/assertions need `/vault` coverage
- Modify: `src/components/__tests__/story-generation-status.test.tsx` only if it exists or is needed to cover the allowlist directly; otherwise extend the workflow test

**Dependencies:** Tasks 1–3 complete.

**Implementation**

1. Update route fixtures that intentionally exercise the archive tab to use `/vault`. Preserve existing Home and Story behavior; do not broaden the story-generation feature.
2. Add or update one focused assertion that global generation status is visible on `/vault` under its existing background-generation conditions and remains hidden on `/story`.
3. Run a manual Native Tabs pass on both platforms. Select Vault from the tab bar, create/open a story, return to Vault, pull to refresh, and confirm active-tab re-selection does not create an accessibility or layout regression. On iOS, also verify the FlatList scroll edge does not make the tab bar’s appearance unsuitable for the dark surface; apply the documented Native Tabs transparent-scroll-edge option only if the device observation confirms that behavior.

**Verify**

- `npm run test:ci -- --runInBand src/app/__tests__/vault.test.tsx src/app/__tests__/story-generation-workflow.test.tsx`
- `npm run test:ci -- --runInBand`
- `npm run lint`
- `npm run typecheck`

## Execution Handoff

Execute inline. The route migration, Native Tabs safe-area behavior, and screen tests are tightly coupled; keeping them together avoids temporarily invalid route imports and lets verification catch the actual navigation contract at each step. Request a focused code review after the full change is validated.

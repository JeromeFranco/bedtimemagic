# Phase 3 Onboarding Flow Implementation Plan

**Goal:** Add a root-gated first-run parent welcome and reusable two-screen anonymous profile-creation flow, then land the parent on Home with the created profile selected.

**Design:** [2026-08-21-onboarding-flow-design.md](../specs/2026-08-21-onboarding-flow-design.md)

**Confidence:** High. The approved design maps to the installed Expo Router `Stack.Protected` API, the existing anonymous Supabase session, the current `children` schema and `createChild` API, and the existing themed button/card/selection-row primitives. Repository inspection identified the required route-group move and confirmed that the current signup trigger must be retired before a clean user can reach onboarding.

**Constraints:**

- Implement US-3.1 and US-3.2 only. Do not add email/Apple sign-up, account claiming, entitlement checks, story allowances, or paywall behavior from US-3.3.
- Keep anonymous Supabase as the sole profile source of truth. AsyncStorage stores only onboarding completion and selected-profile identity; do not introduce a duplicate local profile repository or synchronization layer.
- Use a root Expo Router stack with protected `(onboarding)` and `(app)` groups. Do not implement onboarding as a modal over tabs, a Home redirect, or a custom navigation abstraction.
- Preserve the current app-scoped `StoryGenerationProvider` and `PlayerProvider` lifecycle. Moving routes under `(app)` must not remount those providers during normal Home/Create/Generate/Story navigation.
- Reuse React Native and the current theme/UI primitives. Do not introduce `@expo/ui` for the single nickname field or add a second form convention.
- Never hardcode color, spacing, radius, typography, or touch-target values. Use `@/theme` tokens and update `DESIGN.md` for the new visual flow.
- Use only 150 ms ease-out opacity motion for the welcome, with system reduced-motion behavior. Remove the current bright/elastic splash rather than layering another first-run surface over it.
- Use React Compiler conventions: no `useMemo`; use `useCallback` only where an effect/listener dependency requires stable identity. Any Reanimated shared value must use `.get()`/`.set()`, never `.value`.
- Do not suppress lint, TypeScript, React Hooks, or test failures.
- Run `npm run lint` and `npm run typecheck` after every code-changing task and fix all introduced errors before continuing.

### Task 1: Stop automatic profile seeding

**Outcome:** A newly created anonymous Supabase user starts with zero child profiles, while all existing profiles remain untouched.

**Files / symbols**

- Create: `supabase/migrations/20260821000000_stop_seed_children_on_signup.sql` — retire `on_auth_user_created` and `public.seed_children()`

**Implementation**

1. Add a forward-only migration that performs exactly:
   - `drop trigger if exists on_auth_user_created on auth.users;`
   - `drop function if exists public.seed_children();`
2. Do not delete, rename, update, or backfill any row in `public.children`.
3. Keep the historic seeding migration unchanged; the new migration is the auditable cutover for future users.
4. Apply the migration only to the local Supabase environment during verification. Do not run a remote reset or destructive remote command.

**Verify**

- `npx supabase db reset`
- `npx supabase db lint --local`
- `npm run lint`
- `npm run typecheck`
- Confirm the reset completes with the new migration applied and no SQL object dependency prevents dropping the trigger function.

### Task 2: Make auth, profile, and onboarding bootstrap explicit

**Outcome:** The root can distinguish loading, retryable anonymous-auth failure, first-run onboarding, and an app-ready existing profile without flashing the wrong shell.

**Files / symbols**

- Modify: `src/contexts/AuthContext.tsx` — expose retryable anonymous-auth failure
- Modify: `src/contexts/SelectedChildContext.tsx` — explicit loading/error state and profile creation
- Create: `src/contexts/OnboardingContext.tsx` — bootstrap classification and completion persistence
- Create: `src/contexts/__tests__/AuthContext.test.tsx` — anonymous-auth failure/retry behavior
- Create: `src/contexts/__tests__/SelectedChildContext.test.tsx` — loading, existing-profile, empty-profile, creation, and selection behavior
- Create: `src/contexts/__tests__/OnboardingContext.test.tsx` — clean, migrated, completed, failure, and recovery states

**Implementation**

1. Extend `AuthContextValue` with:

   ```ts
   error: Error | null;
   retryAnonymousSignIn: () => void;
   ```

   Keep the existing `session`, `user`, and `isLoading` fields. A missing persisted session triggers anonymous sign-in. A failure sets `error`, clears loading, and leaves `user` null. Retry clears the error, returns to loading, and repeats anonymous sign-in exactly once. Preserve the existing auth-state subscription and cancellation guards.
2. Extend `SelectedChildContextValue` with:

   ```ts
   isLoading: boolean;
   error: Error | null;
   createProfile: (input: {
     nickname: string;
     developmentalStage: DevelopmentalStage;
     protagonist: Protagonist;
   }) => Promise<ChildProfile>;
   retryLoading: () => void;
   ```

   Keep `profiles`, `selectedProfile`, and `setSelectedProfile`. Make profile loading restart whenever the authenticated user changes; do not retain the current initial `loaded = !user` shortcut, which can expose an empty profile list while a newly established anonymous user is still being fetched.
3. `createProfile` calls the existing `createChild(nickname, developmentalStage, protagonist)`, appends the returned row once, selects it, and attempts to persist `selected_profile_id`. A failure to persist the local selected ID after a successful remote insert is nonfatal: keep the returned profile selected in memory and do not encourage a retry that would create a duplicate.
4. Preserve selected-profile bootstrap behavior: use the stored ID only if it belongs to the fetched profile list; otherwise select the first profile; select `null` for an empty list.
5. Add `OnboardingProvider` with this public contract:

   ```ts
   type OnboardingStatus = 'loading' | 'authError' | 'required' | 'ready';

   type OnboardingContextValue = {
     status: OnboardingStatus;
     error: Error | null;
     completeOnboarding: () => Promise<void>;
     retryBootstrap: () => void;
   };
   ```

   Use storage key `onboarding_complete_v1`.
6. Resolve bootstrap only after auth and selected-profile loading settle:
   - auth/profile still loading → `loading`;
   - anonymous auth failed → `authError` and Retry delegates to `retryAnonymousSignIn`;
   - completion flag exists → `ready`;
   - no flag but at least one profile exists → persist the migrated flag best-effort and return `ready`;
   - no flag and no profiles → `required`.
7. Freeze the initial bootstrap classification for the current onboarding session. When the first profile is inserted, do not switch to `ready` until `completeOnboarding()` is called; this preserves the required ordering between creation, selection, completion, and navigation.
8. `completeOnboarding()` attempts to write the completion flag, then transitions in memory to `ready`. If the local write fails after remote profile creation, still enter `ready`; next launch recovers through the existing-profile migration rule. Do not resubmit the profile.
9. Cover observable transitions rather than internal hook plumbing:
   - no Home/onboarding decision before auth and profile loading settle;
   - failed anonymous auth is retryable;
   - existing profiles skip onboarding and are never deleted;
   - clean empty users require onboarding;
   - profile creation appends/selects once;
   - a completion-storage failure remains recoverable without duplicate creation.

**Verify**

- `npm run test:ci -- --runInBand src/contexts/__tests__/AuthContext.test.tsx src/contexts/__tests__/SelectedChildContext.test.tsx src/contexts/__tests__/OnboardingContext.test.tsx`
- `npm run lint`
- `npm run typecheck`

### Task 3: Add the shared profile draft, validation, and form surfaces

**Outcome:** Both first-run setup and Add Profile can use the same two focused, accessible screens without putting nickname data in route parameters.

**Files / symbols**

- Create: `src/lib/nickname.ts` — normalization and validation contract
- Create: `src/lib/__tests__/nickname.test.ts` — normalization, Unicode, boundaries, and invalid input
- Modify: `src/ui/selection-row.tsx` — optional selected state and supporting text
- Modify: `src/ui/__tests__/selection-row.test.tsx` — selected and supporting-text semantics
- Create: `src/contexts/ProfileDraftContext.tsx` — in-memory draft and flow mode
- Create: `src/components/profile/profile-details-screen.tsx` — nickname and developmental-level form
- Create: `src/components/profile/protagonist-selection-screen.tsx` — five-character selection and submission state
- Create: `src/components/profile/__tests__/profile-details-screen.test.tsx` — validation and level selection
- Create: `src/components/profile/__tests__/protagonist-selection-screen.test.tsx` — explicit selection, back preservation, pending, and failure behavior

**Implementation**

1. Implement the nickname module with this explicit API:

   ```ts
   export const NICKNAME_MAX_LENGTH = 24;
   export function normalizeNickname(value: string): string;
   export function getNicknameValidationError(value: string): string | null;
   ```

   Normalize to Unicode NFC, trim surrounding whitespace, and collapse internal whitespace runs to one regular space. Count normalized Unicode code points with `Array.from`, not UTF-16 code units. Accept 1–24 code points, require at least one Unicode letter or number, and allow only Unicode letters/numbers, spaces, straight or curly apostrophes, and hyphens. Reject line breaks, controls, emoji, and all other punctuation. Do not add a name list, classifier, API call, or claim of real-name detection.
2. Extend `SelectionRow` backward-compatibly:

   ```ts
   supportingText?: string;
   selected?: boolean;
   disabled?: boolean;
   ```

   Existing challenge rows without `selected` retain button semantics. Rows participating in a single-choice set expose selected accessibility state, use only neutral `bgSelected`/border tokens, and never add a checkmark, emoji, chevron, or category color. Supporting text uses the existing secondary/small typography.
3. Add `ProfileDraftProvider` with an in-memory draft:

   ```ts
   type ProfileCreationMode = 'onboarding' | 'add';
   type ProfileDraft = {
     mode: ProfileCreationMode;
     nickname: string;
     developmentalStage: DevelopmentalStage | null;
     protagonist: Protagonist | null;
   };
   ```

   Expose `begin(mode)` to reset the draft before each flow, field setters, and `reset()`. Do not persist the draft or put it in URLs.
4. Build `ProfileDetailsScreen` as a reusable screen component receiving navigation callbacks rather than importing a route-group-specific navigator. It renders:
   - title `Who is tonight’s story for?`;
   - label `Bedtime nickname`;
   - placeholder `Sparky, Rocket, or Buddy`;
   - helper `Use a nickname, not a real name.`;
   - text-only notice `We never ask for real names or birthdates.`;
   - three `SelectionRow`s for the existing `DEVELOPMENTAL_STAGES` values; and
   - one full-width `Continue` button.
5. Use React Native `TextInput`, `KeyboardAvoidingView`, and tokenized styles. Do not add an `@expo/ui` `Host`, custom keyboard manager, or free-form field beyond the nickname. Set suitable text-content/autocorrection behavior without presenting the field as a legal name field.
6. Keep Continue disabled until the normalized nickname and stage are valid. Do not show an error on the first keystroke; show it after blur or an attempted continuation. On successful continuation, store the normalized nickname in the draft before invoking the callback.
7. Build `ProtagonistSelectionScreen` from `PROTAGONISTS`, rendering five text-only rows with name and species. Keep Rex. Do not render the catalog emoji or long personality copy. No protagonist starts selected.
8. The final button label is derived from draft mode: `Finish Setup` for onboarding and `Add Profile` for add mode. While submission is pending, disable repeat submission and use calm text such as `Saving…`; do not add a spinner. Retain all draft fields and show a concise inline retryable error after failure.
9. The shared screen invokes a supplied async submit callback with a fully non-null normalized profile input. It does not decide onboarding completion or final routing; route wrappers own those transitions.

**Verify**

- `npm run test:ci -- --runInBand src/lib/__tests__/nickname.test.ts src/ui/__tests__/selection-row.test.tsx src/components/profile/__tests__/profile-details-screen.test.tsx src/components/profile/__tests__/protagonist-selection-screen.test.tsx`
- `npm run lint`
- `npm run typecheck`

### Task 4: Introduce protected route groups and complete first-run onboarding

**Outcome:** A clean user sees Welcome → Profile Details → Protagonist before the tab shell, while an existing/completed user enters the unchanged app routes.

**Files / symbols**

- Modify: `src/app/_layout.tsx` — provider shell, bootstrap surfaces, and protected root stack
- Create: `src/app/(app)/_layout.tsx` — existing Native Tabs shell
- Move: `src/app/(index,vault)/` → `src/app/(app)/(index,vault)/` — preserve all existing route names and URLs
- Create: `src/app/(onboarding)/_layout.tsx` — onboarding native stack
- Create: `src/app/(onboarding)/index.tsx` — parent welcome
- Create: `src/app/(onboarding)/details.tsx` — initial profile-details wrapper
- Create: `src/app/(onboarding)/protagonist.tsx` — initial protagonist wrapper and completion
- Create: `src/components/onboarding/bootstrap-error.tsx` — anonymous-auth retry surface
- Delete: `src/components/animated-icon.tsx` — obsolete bright/elastic splash implementation
- Modify: `src/app/__tests__/native-stack-layout.test.tsx` — moved app-stack import and unchanged app chrome contract
- Create: `src/app/__tests__/root-layout.test.tsx` — protected shell, loading, and auth-error routing
- Create: `src/app/__tests__/onboarding-flow.test.tsx` — welcome-to-Home behavior and creation failures

**Dependencies:** Tasks 2–3 are complete; bootstrap status, draft state, and shared profile screens are available.

**Implementation**

1. Keep `AuthProvider`, `QueryClientProvider`, `SelectedChildProvider`, `StoryGenerationProvider`, `PlayerProvider`, and `ThemeProvider` in the root layout. Add `OnboardingProvider` after auth/profile providers and add one root `ProfileDraftProvider`. This preserves story-generation and player lifetime across every normal app route.
2. Replace the root’s direct `AppTabs` render with an Expo Router `Stack`. When bootstrap is resolved, register mutually exclusive protected groups:

   ```tsx
   <Stack.Protected guard={status === 'required'}>
     <Stack.Screen name="(onboarding)" />
   </Stack.Protected>
   <Stack.Protected guard={status === 'ready'}>
     <Stack.Screen name="(app)" />
   </Stack.Protected>
   ```

   Both group screens are headerless at the root. While `loading`, render a full-screen `bgDeepest` bootstrap surface and no navigator. For `authError`, render the dedicated Retry surface wired to `retryBootstrap`. Never render both onboarding and tabs.
3. Move the existing array route group intact under `(app)` and put the existing `AppTabs` render in `(app)/_layout.tsx`. Because route groups do not affect public paths, `/`, `/vault`, `/create`, `/generate`, and `/story` remain unchanged. Update relative test imports; do not duplicate routes or retain compatibility files at the old path.
4. Configure the onboarding stack:
   - index/welcome is headerless;
   - details and protagonist use the existing transparent native-header convention and `NativeHeaderIconButton` back action;
   - back from protagonist returns to details with the root draft intact;
   - first-run screens cannot dismiss into the app group because it remains protected.
5. Build the parent welcome directly from design-system primitives:
   - `bgDeepest` background;
   - tagline `Turn bedtime battles into life lessons.`;
   - one short parent-directed supporting sentence;
   - full-width `Create Tonight’s Story` button.
   On press, call `begin('onboarding')` and push the onboarding details route.
6. Apply only a 150 ms ease-out opacity entrance using the installed Reanimated declarative entry API and system reduced-motion behavior. Do not create/read a shared value during render. Remove `AnimatedSplashOverlay`, `AnimatedIcon`, the blue hardcoded surface, elastic keyframes, and their root import. Remove now-unused splash artwork only if repository search proves it has no remaining runtime or configuration references.
7. The details wrapper advances to the onboarding protagonist route. The protagonist wrapper submits in this order:
   - await `createProfile` with the normalized draft;
   - await `completeOnboarding`;
   - allow `Stack.Protected` to remove onboarding and reveal `(app)` at Home.
   Do not issue an explicit push into the protected app group before completion.
8. Preserve draft and error state after remote failure. A local completion-write failure after a successful insert still reveals Home through the recovery behavior defined in Task 2 and must not resubmit the profile.
9. Refresh Expo Router’s generated route types through the project’s Expo route-generation path; never hand-edit `.expo/types/router.d.ts`.
10. Add behavioral coverage proving:
    - loading renders neither onboarding nor app tabs;
    - auth failure renders Retry and invokes one retry;
    - clean bootstrap registers onboarding only;
    - completed/existing-profile bootstrap registers app only;
    - welcome starts a reset onboarding draft;
    - back preserves details;
    - final submission sends the exact nickname/stage/protagonist once;
    - creation failure retains the screen and permits retry;
    - success completes onboarding and resolves to Home;
    - reduced motion removes the entrance transition.

**Verify**

- `npm run test:ci -- --runInBand src/app/__tests__/root-layout.test.tsx src/app/__tests__/onboarding-flow.test.tsx src/app/__tests__/native-stack-layout.test.tsx`
- Run the existing app route suites affected by the move: `npm run test:ci -- --runInBand src/app/__tests__/home-screen.test.tsx src/app/__tests__/create-story-screen.test.tsx src/app/__tests__/story-generation-workflow.test.tsx src/app/__tests__/story.test.tsx src/app/__tests__/vault.test.tsx`
- `npm run lint`
- `npm run typecheck`
- Confirm generated route types accept the onboarding and `/profile/*` paths added by this plan and preserve all existing public app paths.

### Task 5: Enable Add Profile and align profile switching with the design system

**Outcome:** Existing parents can create and select another anonymous profile through the same two-screen flow, and profile chrome no longer relies on nonexistent database emoji fields.

**Files / symbols**

- Create: `src/app/(app)/(index,vault)/profile/details.tsx` — add-mode details wrapper
- Create: `src/app/(app)/(index,vault)/profile/protagonist.tsx` — add-mode protagonist wrapper
- Modify: `src/app/(app)/(index,vault)/_layout.tsx` — profile route header configuration
- Modify: `src/components/profile-selector.tsx` — text-based profile switch action and Add Profile entry
- Modify: `src/components/profile-sheet.tsx` — selection rows and active Add Profile action
- Delete: `src/components/profile-avatar.tsx` — emoji-only profile chrome
- Modify: `src/types/index.ts` — remove `ChildProfile.emoji`
- Modify: affected fixtures in `src/app/__tests__/*`, `src/components/__tests__/*`, and context tests — remove invented `emoji` profile data
- Create: `src/components/__tests__/profile-sheet.test.tsx` — switching and Add Profile routing behavior
- Create: `src/app/__tests__/add-profile-flow.test.tsx` — add-mode end-to-end behavior

**Dependencies:** Task 4 is complete and the app route group owns the existing tab/stack shell.

**Implementation**

1. Add `/profile/details` and `/profile/protagonist` to the shared `(index,vault)` stack with the same transparent native-header/back-button convention already used by Create. These routes stay inside `(app)` and are therefore unavailable during first-run onboarding.
2. On Add Profile:
   - close the profile sheet;
   - call `begin('add')` to clear any previous draft/error;
   - push `/profile/details`.
3. The add-mode details wrapper pushes `/profile/protagonist`. The final wrapper awaits `createProfile`, then calls `router.dismissTo('/')` so both profile screens leave the stack and Home remains the destination. Do not call `completeOnboarding`; the app is already ready.
4. Keep cancellation/back available in add mode. Back from protagonist returns to details with the draft preserved; back from details returns Home without changing existing profiles.
5. Rewrite the profile sheet with `SelectionRow` controls:
   - visible nickname label;
   - developmental-stage supporting text from `DEVELOPMENTAL_STAGES`;
   - selected accessibility/neutral surface state;
   - no emoji or checkmark;
   - one active text-based `Add Profile` action.
   Selecting an existing profile keeps the current behavior: select it once and close the sheet.
6. Replace the header’s emoji-only `ProfileAvatar` trigger with a compact text action such as `Switch profile`, using the existing button primitive. Do not add a new icon-only control or derive another decorative avatar.
7. Remove `ChildProfile.emoji`, `ProfileAvatar`, and every profile fixture’s invented emoji field in the same task so TypeScript and runtime database rows agree. Do not add a compatibility alias or computed emoji field.
8. Cover:
   - selected-row accessibility state;
   - switching an existing profile closes the sheet;
   - Add Profile closes the sheet, resets add-mode draft, and routes correctly;
   - add-mode final submission creates/selects once and dismisses to Home;
   - failure retains the draft and does not dismiss;
   - cancel/back leaves existing selection unchanged.

**Verify**

- `npm run test:ci -- --runInBand src/components/__tests__/profile-sheet.test.tsx src/app/__tests__/add-profile-flow.test.tsx`
- Run any fixture-owning app/context suites changed by removal of `ChildProfile.emoji`.
- `npm run lint`
- `npm run typecheck`

### Task 6: Align requirements documentation and verify the complete native flow

**Outcome:** Product documentation matches the approved behavior, all client contracts pass, and the actual iOS and Android surfaces prove the first-run and Add Profile journeys.

**Files / symbols**

- Modify: `docs/user-stories.md` — rename/rewrite US-3.1, include protagonist selection in US-3.2, use inline level rows, document objective nickname validation and anonymous Supabase persistence, and name Rex in US-0.1
- Modify: `docs/prd.md` — replace the obsolete Adult Gate/dropdown/local-profile language with the approved parent-welcome and anonymous-profile behavior
- Modify: `DESIGN.md` — document first-run welcome, two-screen profile setup, text-only profile switching, reduced-motion entrance, and Home landing; keep YAML unchanged unless implementation introduced a genuinely new token
- Modify only if route generation changes it: `.expo/types/router.d.ts` — generated by Expo, never hand-edited

**Dependencies:** Tasks 1–5 are complete and focused tests pass.

**Implementation**

1. Smoke-test a clean first-run state on iOS and Android using local Supabase:
   - remove/reset the app’s local session/storage and create a fresh anonymous user;
   - verify no seeded child profiles appear;
   - verify no Home/tabs flash before the parent welcome;
   - continue through nickname, one level, and one protagonist;
   - verify invalid nickname boundaries and keyboard avoidance;
   - simulate/observe one profile-creation failure and Retry without duplicate rows;
   - complete setup and verify Home shows the newly selected profile;
   - relaunch and verify onboarding does not return.
2. Smoke-test Add Profile:
   - open Switch profile → Add Profile;
   - verify back/cancel preserves the existing profile;
   - add a second profile and verify it becomes selected;
   - relaunch and verify the selected profile remains valid.
3. Complete accessibility/native checks:
   - VoiceOver and TalkBack announce labels, supporting text, selected state, disabled actions, validation error, and Retry meaningfully;
   - controls remain at least 44×44pt and usable one-handed;
   - compact iPhone and Android layouts clear safe areas and keep the CTA visible/reachable with the keyboard;
   - reduced motion produces static welcome content;
   - onboarding has no tabs, emoji, decorative iconography, bright background, spinner, spring, or elastic motion.
4. Fix any behavioral findings at their source, rerun the affected focused test and `npm run lint`/`npm run typecheck`, then repeat the failed smoke scenario until it passes. Do not weaken assertions, add timing sleeps, or suppress warnings.
5. After both native smoke paths pass, update the requirement documents. Do not mark US-3.3 complete or imply that a permanent account exists.
6. Keep legal wording precise: the app is parent-directed and data-minimal; it does not claim that the welcome verifies adulthood or that nickname validation detects real names.
7. Keep `DESIGN.md` YAML and `src/theme/*` synchronized. No new visual token is expected; use existing backgrounds, selected surface, borders, spacing, radii, typography, and 150 ms motion token. If implementation demonstrates a missing normative token, add it to both places in the same change rather than hardcoding it.
8. Run the complete client suite, lint, and both TypeScript checks after documentation cleanup. Fix actual regressions and repeat the applicable verification before handoff.

**Verify**

- `npm run test:ci -- --runInBand`
- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:functions`
- `npx supabase db lint --local`
- Actual iOS first-run and Add Profile smoke scenarios above
- Actual Android first-run and Add Profile smoke scenarios above

## Requirement traceability

- Parent welcome, tagline, CTA, persistence, and no shell flash: Tasks 2 and 4.
- No ineffective adult verification: Tasks 4 and 6.
- Nickname field, privacy guidance, and objective validation: Task 3.
- Three inline developmental-level choices: Task 3.
- Explicit Barnaby/Nova/Pip/Luna/Rex choice: Task 3.
- Anonymous Supabase profile creation and selected-profile persistence: Tasks 1–2 and 4.
- First-run Home landing: Task 4.
- Existing-install migration without data deletion: Tasks 1–2.
- Add Profile reuse: Task 5.
- Dark-only, tokenized, reduced-motion UI: Tasks 3–6.
- US-3.3 exclusion: global constraint and Task 6 documentation.

## Execution Handoff

Recommend **inline execution followed by a fresh focused code review**. The migration, auth/profile bootstrap, protected root navigator, route-group move, shared draft, and profile submission ordering are tightly coupled: splitting them across independent workers would create long-lived uncompilable intermediate states and duplicate navigation context. Implement tasks sequentially in one session, then request a focused review of bootstrap recovery, route guards, duplicate-creation prevention, accessibility semantics, and documentation alignment before final native smoke verification.

# Progressive Story Setup Flow

Status: Proposed design
Date: 2026-08-19
Scope: Home-to-generation entry flow, story-prompt selection UI, and the supporting design-system pattern

## Summary

Home will become a calm landing surface instead of a combined landing page and challenge form. A parent starts with one clear action, then chooses a category and a specific situation in a focused, two-step Create Story route. Selecting the situation starts the existing generation lifecycle.

The resulting route sequence is:

```text
Home → Create Story → Generate → Story
```

`/generate` retains its current meaning: the focused in-progress generation screen. `/create` owns prompt selection. This resolves the current mismatch between `DESIGN.md`, which assigns prompt selection to Generate, and the implemented generation-loading route.

## Problem

The current Home route renders all of the following in one scroll surface:

- the selected child and story context;
- an optional recent-story card;
- four challenge categories;
- a conditionally expanded group of triggers; and
- the final creation action.

The category matrix and trigger chips are workable with the current four-by-three dataset, but they compete with Home's other jobs and grow vertically as new choices are added. The parent must scan a form before they can tell what the primary action is. Long category or trigger labels will further reduce the usefulness of the two-column grid.

## Goals

- Make Home immediately understandable and calm.
- Preserve the fast, three-tap path from Home to a generation request.
- Give categories and triggers room to grow without redesigning the flow.
- Keep each view focused on one decision.
- Preserve the selected child and protagonist context throughout selection.
- Reuse the existing generation coordinator, request snapshot, and `/generate` loading experience.
- Use only the established dark, low-stimulus visual language and token system.
- Provide a reusable selection pattern with accessible, one-handed targets.

## Non-goals

- Changing story-generation requests, prompts, Edge Functions, or persistence.
- Adding a review/confirmation screen after a trigger is selected.
- Allowing multi-select categories or triggers.
- Introducing recommendations, history-based quick picks, search, filters, or custom free-text situations.
- Adding decorative category emoji or a new icon system.
- Changing the Home/Vault Native Tabs structure.
- Adding new colour, spacing, radius, or typography tokens.
- Redesigning the `/generate` calming/loading or background-generation-status experiences.

## Experience Design

### Home

Home keeps its current child-specific headline, protagonist/time subtitle, profile selector, and optional recent-story card. It no longer renders `ChallengeMatrix`, its `Or make a new one` label, or any trigger controls.

The primary Home action is a single full-width button below the contextual content:

> Create Tonight's Story

If a recent story exists, its card remains the secondary continuation path. The creation button remains visually and semantically primary, rather than making the parent infer that the matrix is how to start.

Home continues to use one safe-area-aware vertical scroll surface and the existing content width and spacing conventions. It must remain useful whether the story query is loading, empty, or populated.

### Create Story: category step

The new `/create` route opens at the category step. It is a dedicated, ordinary stack screen rather than a sheet or a nested picker.

Visual order:

1. Native back affordance supplied by the Create route's stack header.
2. Compact child context, for example: `A story for Mia`.
3. Title: `What needs a story tonight?`
4. A single-column list of category choices.

Each category is a full-width, pressable selection row. It presents its visible text label only; it does not render the existing category emoji. Rows use the established `Card` surface, 16px card padding, token typography, and native press feedback. Unselected rows are neutral. A pressed row may use that category's existing low-opacity tint during feedback, but the meaning is communicated by the label and the route transition, never colour alone.

Tapping a category proceeds immediately to the trigger step. There is no Continue button and no persistent selected row on this step, so the parent makes one unambiguous decision.

### Create Story: trigger step

The trigger step presents only situations for the chosen category.

Visual order:

1. The Create route's stack back affordance.
2. The same compact child context.
3. A small, non-interactive chip naming the chosen category.
4. Title: `What happened?`
5. The available trigger choices.

Short trigger labels use the existing wrapping `Chip` pattern. The screen remains scrollable so future categories can contain more options than fit on a compact phone. If a trigger label or category's trigger count no longer suits wrapped pills, that category must switch to the same full-width selection rows; the route and state model remain unchanged.

Tapping a trigger is the terminal selection. It immediately captures the selected child, category, and trigger using the existing `StoryGenerationContext`, then moves to `/generate`. No extra review action is added: the complete default path is Home CTA → category → situation.

### Navigation and generation handoff

The transition from Home to Create uses push navigation. After a terminal trigger selection starts successfully, Create replaces itself with `/generate`, leaving Home as the previous screen. This preserves the established meaning of **Leave**, **Keep Creating**, and cancellation: returning from generation returns to Home, not to a stale form with a selected trigger.

The Create route owns only the selected category while it is on screen. It obtains the current profile from `SelectedChildContext` and creates the generation snapshot only at the terminal trigger tap. No route parameters, persisted draft, or additional global state are required.

Back behavior is deterministic:

- Back from the category step returns to Home without starting a request.
- Back from the trigger step returns to the category step and preserves the selected category.
- Back or leaving before the trigger tap does not create, cancel, or alter generation state.
- If an active generation already exists, the Home creation entry point follows the existing one-active-request policy and returns the parent to the active generation experience rather than opening another setup flow.

If a selected profile is unavailable, Home does not expose a misleading creation action. It follows the app's existing profile-selection/onboarding behavior rather than constructing an incomplete generation snapshot.

## Interaction and Accessibility

- Every category row, trigger choice, and CTA has a minimum 44×44pt target and uses `PressableFeedback` for platform-native feedback.
- Category and trigger controls expose button semantics and their visible label as the accessible name.
- The trigger screen announces its title and selected category when it becomes active; assistive-technology users never need to infer their earlier choice from tint alone.
- The stack back affordance is the only required way to revise a category. The selected-category chip is contextual, not a hidden second action.
- The flow has no progress bar, countdown, automatic advancement beyond the explicit selection, or celebratory feedback.
- Use the normal stack transition and native press feedback. Do not add the current directional/staggered Reanimated entry animations to the new flow; the motion language is restrained and settling.
- Long translated or future labels wrap within their row or chip without overlap, truncation, or reducing the touch target.

## Visual System

The implementation uses existing theme tokens only:

- `bg-base` for route backgrounds, `bg-surface` for category rows, and `bg-element` for neutral chips and the primary button.
- `text-primary` for titles and labels, `text-secondary` for contextual copy, and `text-muted` only for de-emphasized metadata.
- Existing category tints and borders only for the active category context or transient category press state. Category colours must not become page backgrounds, decorative fills, or competing primary CTAs.
- Existing `Spacing`, `Typography`, `BorderRadius`, `Layout.maxContentWidth`, and `Layout.minTouchTarget` values.

No shadows, gradients, emoji chrome, decorative iconography, or card grid are introduced. The Create views use the same centered single-column maximum width, horizontal screen margin, and safe-area treatment as the rest of the app.

### Existing chip-size discrepancy

`DESIGN.md` requires 44×44pt touch targets everywhere, while its YAML token describes a 40px chip height and the current `Chip` base has `minHeight: 40`. The implementation must resolve this before using chips as trigger controls. The proposed resolution is to make the interactive chip target 44pt using the existing `Layout.minTouchTarget`, then update the DESIGN.md YAML chip-height value and the implementation together so the system has one source of truth. This is a documentation/token alignment, not a new token.

## Client Design

### Route and screen boundaries

- Add `src/app/(index,vault)/create.tsx` as the dedicated Create Story route.
- Register `create` in the grouped stack layout with its stack header explicitly enabled. Other focused routes retain the existing headerless convention; Create uses the framework-managed native back affordance rather than a custom icon-only control.
- Keep `src/app/(index,vault)/generate.tsx` exclusively for active generation, retry, cancellation, and leave/background behavior.
- Simplify `src/app/(index,vault)/index.tsx` to Home context, recent-story replay, and navigation to Create.

### Presentation components

Replace the matrix-specific presentation with focused, composable pieces:

- A generic pressable selection-row primitive built on `Card`, suitable for future single-choice lists.
- A category picker that maps `CHALLENGE_CATEGORIES` to selection rows.
- A trigger picker that filters `CHALLENGE_TRIGGERS` by the selected category and selects a terminal trigger.

The new generic primitive belongs with other reusable UI surfaces only if its contract is genuinely general. Otherwise, picker composition remains local to the story-setup feature. Existing `Card` and `Chip` retain their static-versus-pressable behavior: omitting `onPress` must not create a pressable surface.

`ChallengeMatrix` is removed after all callers migrate. Do not keep an unused compatibility component or duplicate selection logic.

### State and lifecycle contract

`CreateStoryScreen` holds `selectedCategory: ChallengeCategory | null` locally. It derives triggers from the existing typed source list; it does not copy or persist trigger data.

On a terminal trigger action, the screen builds the existing `StoryGenerationSnapshot` from:

- selected profile id, display name, protagonist, and developmental stage;
- locally selected category; and
- the chosen trigger id.

It calls `startGeneration(snapshot)` once. On `{ status: 'started' }`, it replaces Create with `/generate`. On `{ status: 'already-generating' }`, it does not navigate to a second setup path or start another request; it takes the parent to the established active-generation route.

No React Compiler opt-outs, lint suppressions, or manual memoization are introduced. Callback identity is stabilized only where an effect or native listener requires it.

## Edge Cases

- A category with no registered triggers does not present an empty picker. It has no selectable row until content is supplied, or renders a concise unavailable state without a creation action; this invariant should be asserted while extending the data source.
- A category with many triggers scrolls normally; it does not force a smaller font, tighter-than-token spacing, or horizontal scrolling.
- A trigger label that cannot form a useful chip remains a full-width row and preserves the same terminal-selection behavior.
- Changing profiles before opening Create affects the next flow. The profile snapshot is fixed only after the trigger is selected, preserving current generation semantics.
- A profile change elsewhere while Create is visible uses the currently selected profile at terminal selection, unless product requirements later introduce a locked draft profile.
- If generation fails or the parent cancels, existing `/generate` behavior returns to Home. No partially selected Create state is restored.
- A second terminal press cannot produce two requests; the existing generation coordinator remains the concurrency boundary.

## Documentation Impact

When implementing, update `DESIGN.md` and its YAML front matter in the same change to:

- change the app shape from `Home → Generate (challenge matrix + child profile) → Story` to `Home → Create Story → Generate → Story`;
- describe Home as a focused landing surface with one primary story-creation CTA;
- define the full-width selectable-row pattern for growing single-choice lists;
- record the category-then-trigger progressive-disclosure flow and terminal trigger behavior;
- align chip height with the 44pt interactive target resolution above; and
- retain the restriction that category colours are limited to challenge-selection context.

The code in `src/theme/*` and DESIGN.md YAML must be changed together; no visual token documentation is updated independently of the implementation.

## Testing Strategy

Focused React Native Testing Library coverage must test user-visible behavior, not navigation-library internals or style snapshots.

Required coverage:

- Home renders the creation CTA and no longer renders the challenge matrix or its trigger controls.
- Home retains recent-story replay behavior with and without story data.
- Pressing Home's creation CTA opens `/create` when generation is idle.
- Category choices render from the typed source list and selecting one reveals only its triggers.
- Trigger selection starts one generation request with the selected child/category/trigger snapshot and replaces the route with `/generate`.
- Back from triggers returns to categories without starting a request; back from categories returns Home.
- An active generation cannot be replaced by a new request through the Create entry point.
- Accessible names, selected-category context, and 44pt target styling/props are present for every interactive choice.
- Long labels and a category with enough trigger items to scroll remain reachable in a targeted layout or component test.
- The existing generation workflow test continues to prove Leave, Keep Creating, failure, and ready-state behavior after Home no longer starts requests directly.

Manual visual verification must cover at least a compact iPhone and an Android device/emulator. Check safe areas, one-handed reachability, Home-to-Create hierarchy, category-row wrapping, trigger wrapping/scrolling, back behavior, an active-generation redirect, reduced-motion behavior, and screen-reader announcements.

After implementation, run the focused tests, the full relevant test suite, `npm run lint`, and `npm run typecheck` after each code-changing task.

## Acceptance Criteria

- Home has one explicit, full-width story-creation CTA and no embedded challenge matrix.
- The supported happy path requires exactly Create Tonight's Story → category → trigger before generation begins.
- `/create` is the only prompt-selection route and `/generate` remains the generation-progress route.
- Categories and triggers can grow without reintroducing a two-column form on Home.
- Back navigation never starts a request and terminal selection never leaves a stale setup screen beneath generation.
- Existing session-scoped generation ownership prevents duplicate requests.
- All new interaction surfaces meet the resolved 44pt minimum target and use existing tokens/native press feedback.
- No new visual tokens, shadows, gradients, emoji chrome, progress UI, or decorative iconography are introduced.
- `DESIGN.md`, `src/theme/*`, reusable UI contracts, and the implemented flow agree.

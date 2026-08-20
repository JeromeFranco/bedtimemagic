# Native Screen Chrome and Edge-to-Edge Scrim

Status: Approved design
Date: 2026-08-19
Scope: Edge-to-edge system-bar treatment and native navigation headers across the app's existing routes

## Summary

Bedtime Magic will use a quiet, fixed vertical scrim behind the Android status bar (and the equivalent top system area on iOS) so light system icons remain legible as content moves beneath edge-to-edge chrome. The scrim is a small system-chrome treatment, not a screen background.

Navigation will move to Expo Router's native Stack header for every route that has a navigation action. The native header retains platform transitions, safe-area integration, title layout, and accessibility. Its left and right slots may host the existing circular icon control; this is a native-header item, not a replacement header.

The story player is included. It remains visually immersive through a transparent native header and screen-owned scrim, while its current back and sleep-mode controls move into that header.

## Problem

Android edge-to-edge lets application content draw behind the status bar. The current Home and Vault scroll surfaces manually add Android top inset padding, which avoids overlap but leaves no deliberate surface behind the system icons when content reaches the top. The current grouped Stack also hides headers globally, so Create is the only route that opts into a native header and the Story player builds an independent top bar.

This creates two separate concerns:

- System chrome has no reusable, tokenized readability treatment across scroll surfaces.
- Back and navigation actions are implemented inconsistently: stock native header on Create, a custom player top bar on Story, and route-specific inline Leave/Go Back actions on Generate.

## Goals

- Make light status-bar icons consistently legible with Android edge-to-edge content.
- Use one restrained, tokenized vertical scrim rather than page gradients or per-screen color literals.
- Retain native Stack transitions, title handling, accessibility semantics, and safe-area behavior.
- Use the existing circular navigation-icon treatment wherever an explicit header action is present.
- Bring Create, Generate, and Story under the same native-header contract while preserving their lifecycle behavior.
- Keep Home and Vault simple tab-root scroll surfaces; do not add false back actions where none exists.
- Preserve the dark, low-stimulus visual system and the 44pt interaction floor.

## Non-goals

- Replacing Expo Router's native Stack with a JavaScript stack or a custom `header` component.
- Adding a decorative gradient to any page, card, tab bar, artwork, or player background.
- Changing Native Tabs, their scroll-edge policy, or the bottom navigation treatment.
- Changing story-generation requests, audio playback, wind-down sequencing, cache behavior, or route history semantics.
- Introducing a global absolute overlay above the application navigator.
- Adding a navigation action to Home or Vault simply for visual symmetry.

## Experience Design

### System-bar scrim

Each screen that draws beneath the top system chrome renders the same `StatusBarScrim` as a fixed, non-interactive layer at its own root. It begins at the top edge, uses a dark opaque-to-transparent vertical gradient, and fades out below the status/header area. It remains stationary while a ScrollView or FlatList moves beneath it.

The component does not darken screen content once it is below the fade distance. It has no shadow, blur, animation, touch handling, accessible role, or visual meaning beyond icon legibility.

The treatment applies to Home, Vault, Create, Generate, and Story:

- Home and Vault use it behind the status bar only; their existing inline screen context and Native Tabs remain unchanged.
- Create and Generate use it behind both the status bar and their transparent native headers.
- Story uses it behind the status bar and transparent native header, preserving an immersive, continuous player surface.

This is an app-wide policy implemented locally at each screen boundary. A single root-level overlay is explicitly rejected because it would cross navigator ownership boundaries, compete with Native Tabs, and be difficult to size correctly during route transitions.

### Native header policy

The grouped Expo Router Stack owns the shared native-header baseline for pushed screens:

- transparent background, no shadow or bottom border;
- light title and icon tint appropriate to the dark theme;
- native Stack title and transition behavior; and
- screen content laid out with the actual native header height, rather than a fixed top value.

Screens that use a transparent header must reserve the header's height before their first interactive content. Scroll screens retain platform automatic inset adjustment on iOS and use the supported native-header height/inset on Android. The result must be one top offset, never stacked manual status and header padding.

Home and Vault remain headerless tab roots. They do not need a back action, and their existing first content establishes the screen's context. Their status-bar scrim is independent of navigation-header presence.

### Circular native-header items

The native header's `headerLeft` and `headerRight` extension points host the existing filled circular `IconButton` treatment. The header itself remains Expo Router's native Stack header; the implementation must not provide the Stack `header` replacement prop or reproduce the header layout in a screen component.

Each circular item:

- has the existing 44pt minimum target, `bgElement` fill, circular shape, platform symbol, and platform press feedback;
- uses a visible-action-matched accessibility label; and
- replaces, rather than sits beside, the stock back button when it represents Back.

The stock native back glyph is hidden for routes with the circular replacement. This is the smallest supported customization that guarantees the same circular visual treatment on Android and iOS; a fully stock native back button cannot provide that cross-platform shape.

### Route behavior

| Route | Header treatment | Header actions | Content consequence |
| --- | --- | --- | --- |
| Home | No Stack header; status scrim only | None | Keep current dynamic headline and profile control. |
| Vault | No Stack header; status scrim only | None | Keep current list header and pull-to-refresh behavior. |
| Create | Transparent native header and scrim | Circular Back | Keep its existing title and selection flow; its scroll content begins below the native header. |
| Generate | Transparent native header and scrim | Circular Back | Back invokes the existing leave-confirmation lifecycle; the inline Leave control is removed to avoid duplicate actions. In failure state, Back retains the existing dismiss-and-return behavior. |
| Story | Transparent native header and scrim | Circular Back; circular Sleep Mode while playback is idle | The player top bar is removed. The native title is the story title, and the duplicate in-player title is removed while its protagonist/moral metadata remains. During Pillow Talk, affirmation, and terminal fade, Sleep Mode is absent; Back retains the current finish-wind-down or stop-and-return semantics. |

The circular Back action must dispatch the same route-specific behavior as the current screen. In particular, Story Back must still stop ordinary playback before returning, and must finish—rather than abruptly exit—the active wind-down sequence. Generate Back must still be intercepted by its existing `beforeRemove` policy while generation is active.

## Visual System

### New tokens and DESIGN.md exception

`DESIGN.md` currently prohibits gradients. The implementation updates its YAML and prose, together with `src/theme/colors.ts`, to make one narrow exception:

> Backgrounds remain solid. A vertical gradient is allowed only for the fixed system-bar readability scrim; it must fade from the dark system-chrome token to transparent and must not be used as page decoration.

Add matching, semantically named color tokens for the opaque and transparent scrim stops. Their values derive from the existing deepest night surface; route code and the scrim component must consume those tokens rather than color literals. No new spacing, radius, typography, accent, shadow, or motion tokens are required. The scrim height derives from the measured system/header height plus existing spacing tokens.

The header item reuses the existing icon-button surface and existing regular SF Symbol/Material Symbol mappings. Navigation is an established exception to the general no-icon-only-control rule.

## Client Design

### Shared component boundary

Introduce one reusable `StatusBarScrim` presentation component near the existing UI primitives. It receives the measured top-chrome height it must cover and renders an `expo-linear-gradient` absolute layer with `pointerEvents="none"`. It does not inspect navigation state or own safe-area logic.

Each route owns whether it has a native header and passes the correct measured height. This preserves composability across tab roots, ordinary Stack routes, and the player without an app-wide z-index contract.

Use the SDK-matched `expo-linear-gradient` package rather than a custom native module, a platform-specific view, or manually layered translucent Views.

### Stack configuration

The grouped stack layout centralizes dark transparent-header defaults for Create, Generate, and Story. Per-screen configuration supplies a title and route-specific header items. Dynamic Story header options are declared from the Story route so they can reflect the loaded title, playback phase, and sleep-mode state without rebuilding navigation infrastructure.

Header-item callbacks must respect React Compiler rules: do not introduce manual memoization unless callback identity is required by a listener or native header-option lifecycle. Existing stable callbacks that are effect dependencies remain stable.

### Story-player migration

`StoryPlayer` no longer renders its local `topBar`, `SafeAreaView` top edge, Back `IconButton`, or Sleep Mode `IconButton`. The screen route configures those controls in the native header. The player still owns body playback controls, artwork, wind-down content, and animations.

The route remains responsible for its existing cleanup and navigation contracts. The migration changes control placement only; it must not alter playback completion, cancellation, story prefetching, `beforeRemove` behavior, or post-story phase transitions.

### Generate migration

The Generate header's left item triggers the appropriate current back behavior rather than bypassing navigation. During active generation, native Back flows through the existing confirmation listener. During failure, its route-specific handler dismisses the status then returns. The existing inline Leave button is removed once the equivalent native-header action is present.

## Accessibility

- Status scrims are hidden from the accessibility tree and never intercept input.
- Circular controls retain button semantics and descriptive labels: `Go back` and `Sleep Mode`.
- Native header titles expose the current route/story context using the platform's normal header semantics.
- The Story sleep-mode control is absent when it cannot act, rather than disabled without explanation.
- All controls continue to meet the 44×44pt target on compact Android and iOS devices.
- Light icons and title text maintain the contrast required by `DESIGN.md` over both scrim stops and scrolling content.

## Edge Cases

- A short Home or Vault surface still receives the status-bar scrim; it must not create a visible hard edge below the top area.
- Scroll refresh, loading, empty, and error states in Vault preserve their current reachability and top inset behavior.
- A long story title truncates using native-header behavior and never overlaps Back or Sleep Mode.
- Story loading and error states use the standard route chrome without attempting to render a title from unavailable story data.
- Back pressed during Story's `fade_to_black` remains unavailable/ineffective as today; it must not interrupt the terminal curtain.
- Repeated Back presses during Generate's confirmation cannot dispatch a second leave action or bypass the active-generation policy.
- Screen rotation is out of scope because the app remains portrait locked, but safe-area/device cutout changes must be measured rather than assumed.
- Web should render the same neutral dark top treatment without relying on Android-only status-bar APIs.

## Testing Strategy

Automated tests should assert behavioral contracts and configuration inputs, not pixel snapshots of native chrome:

- `StatusBarScrim` uses the named theme tokens, is non-interactive, and accepts measured top-chrome height.
- Home and Vault preserve their existing scroll, loading, empty, retry, refresh, and Native Tabs behavior with the scrim present.
- Create content clears its native header and its circular Back action preserves the category/trigger back semantics.
- Generate circular Back follows the existing confirmation/dismiss behavior in generating and failed states, and no duplicate inline Leave control remains.
- Story's header Back invokes stop-and-return during ordinary playback and finish-wind-down during post-story phases; Sleep Mode remains available only during idle playback.
- Story player no longer contains a local top bar, while all existing playback and wind-down tests remain valid.
- Dynamic Story header title handles loading/error/long-title states without an inaccessible or overlapping control.

Run focused route/player tests, the full affected Jest suite, `npm run lint`, and `npm run typecheck` after each code-changing task. No lint suppression, test-only behavior, or React Compiler opt-out is permitted.

Manual device verification is required on a compact Android device/emulator and iPhone:

- light status icons remain readable while Home, Vault, and Create scroll beneath the top edge;
- there is no seam, duplicate top inset, or content overlap at the status/header boundary;
- native header transitions and circular controls look centered and retain native press feedback;
- Story remains immersive despite the transparent header, including sleep mode and every wind-down phase; and
- the tab bar, pull-to-refresh, and system gesture areas remain unaffected.

Automated tests cannot establish physical system-bar geometry, native-header alignment, or the perceived softness of the scrim fade; those findings must be recorded from the device pass.

## Acceptance Criteria

- Every supported route has a deliberate top system-chrome treatment; Home and Vault use the scrim without an invented navigation action.
- Create, Generate, and Story use Expo Router's native transparent Stack header, not a custom header layout.
- All visible header navigation actions use the same circular 44pt treatment through native-header item slots.
- Story's former custom top bar is fully replaced without changing stop, wind-down, or sleep-mode behavior.
- A tokenized status-bar scrim improves edge-to-edge legibility without becoming a page gradient.
- `DESIGN.md` and `src/theme/*` document the narrow gradient exception consistently.
- Existing scroll behavior, native tab behavior, generation lifecycle protection, and player lifecycle behavior remain intact.
- Automated validation passes and physical iOS/Android verification confirms system-bar geometry and visual continuity.

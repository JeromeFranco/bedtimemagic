# Home Screen Redesign — Design Spec

**Date:** 2026-08-15
**Scope:** `src/app/(index,vault)/index.tsx` (the first screen users see)
**Approach:** "Continue First" — elevate the replay path for returning parents, warm up the copy, and introduce calm vertical rhythm while staying inside DESIGN.md's visual system.

---

## 1. Goal & Non-Goals

**Goal:** Make the first screen feel like a calm, inviting bedtime ritual rather than a transactional launcher. Specifically:

- Give returning parents a one-tap "listen again" path surfaced as a proper visual anchor (cover art card), not a buried ghost link.
- Warm up the header copy and remove DESIGN.md violations (emoji in chrome, arrow glyph).
- Introduce calmer vertical spacing — generous between blocks, tight within — so the screen breathes.
- Apply the theme's Typography presets and weights consistently per section.

**Non-Goals:**

- Changing the ChallengeMatrix flow (category → trigger → CTA, 3 taps to generate).
- Introducing gradients, decorative imagery, or new accent colors.
- Touching the vault screen, story screen, or generate screen.
- App-wide font changes (rounded/serif). Fonts stay system sans for cross-screen consistency.

---

## 2. Layout (top to bottom)

```
SafeArea (maxWidth 800, centered)
┌──────────────────────────────────────────┐
│  [Headline]                  [Avatar]    │  header row
│  [Subtitle · protagonist · time]         │
│                                          │
│  ─── gap 2xl (32) ───                    │
│                                          │
│  ┌────────────────────────────────────┐  │  ONLY if a recent story exists
│  │ [cover 56]  Title            chev> │  │  "Listen again" card (tappable)
│  │            Barnaby · 10 min         │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ─── gap xl (24) ───                     │
│  Or make a new one                       │  section label (ONLY with card)
│  ─── gap sm (8) ───                      │
│  [ ChallengeMatrix 2×2 ]                 │
│  [ triggers (conditional) ]              │
│  [ Create Tonight's Story ]               │
└──────────────────────────────────────────┘
```

**No-recent-story state (first-time user):** the card and the "Or make a new one" label are both absent. The headline flows directly into the ChallengeMatrix via the 2xl gap. The categories themselves are the invitation — no "No stories yet" empty state (DESIGN.md §7).

---

## 3. The "Listen Again" Card

A new component, `src/components/recent-story-card.tsx`, following the existing separate-component pattern (`ChallengeMatrix`, `ProfileSelector`).

**Props:** `story: Story`, `onPress: () => void`.

**Structure:**

- Built on the existing `Card` component (`bgSurface`, rounded 16, subtle border, no shadow, `onPress`).
- Horizontal layout inside the card content (override `contentStyle` to a row):
  - **Left:** cover image, 56×56, 1:1, no border radius (card's rounded corners clip it). Image source = `story.cover_image_url`. If null, a solid `Colors.dark.bgElement` square placeholder (no emoji — chrome rule).
  - **Middle (flex 1):** title (`ThemedText type="link"` with `fontWeight: '700'`, `textPrimary`) on top; subtitle (`ThemedText type="small"`, `textSecondary`) below — "{protagonistName} · 10 min".
  - **Right:** `SymbolView` from `expo-symbols`, `name="chevron.right"`, `Colors.dark.textMuted`, 17pt. A navigation disclosure affordance (allowed by DESIGN.md §3d — icons for navigation). No play button; the whole card is the tap target.

**Behavior:** `onPress` → `router.push({ pathname: '/story', params: { id: story.id } })` (same as the current replay handler).

---

## 4. Copy & Voice

| Element | Current | Proposed |
|---|---|---|
| Headline | "What's happening with {childName} tonight?" | **"Tonight's story for {childName}"** — uses the approved phrase, warmer, less interrogative. Falls back to "Tonight's story" when no child selected. |
| Subtitle | "Featuring Barnaby 🐻 · 10 min bedtime story" | **"Barnaby will tell it · about 10 minutes"** — no emoji (chrome rule), protagonist stays named, duration preserved. Protagonist falls back to "Barnaby" when none selected (existing behavior). |
| Replay CTA | "Listen to recent story again →" (ghost Button, arrow glyph) | **Removed.** Replaced by the card. |
| Section label | (none) | **"Or make a new one"** — shown only when the card is present. |

All copy under 8 words. No banned words ("magic" outside the app name, "journey", "unlock", "elevate", "seamless", "empower", "delight"). Direct "you" register preserved.

---

## 5. Spacing & Rhythm (calm requirement)

The current screen uses a flat `gap: Spacing.xl (24)` across all `ScrollView` children, plus a redundant `marginTop: Spacing.xs` on the top row. Proposed rhythm applies the principle *generous between blocks, tight within*:

| Gap | Token | Value | Notes |
|---|---|---|---|
| ScrollView content `gap` | `Spacing['2xl']` | **32** | Primary "calmer" lever — air between header, card, and the label+matrix group. Up from 24. |
| Header: headline → subtitle | `Spacing.xs` | 4 | They're one unit. |
| Card → section label | (outer gap) | 32 | Provided by ScrollView gap. |
| Section label → ChallengeMatrix | `Spacing.sm` | 8 | Label sits close to what it introduces. Achieved by wrapping label + matrix in a `View` with `gap: sm` so the outer 32px gap doesn't separate them. |
| Matrix internals | unchanged | — | `ChallengeMatrix` container `gap: xl` (24); chip-to-chip `sm` (8). |
| Top padding | `Spacing.xl` | 24 | + safe area inset. Unchanged. |
| Bottom padding | `BottomTabInset + Spacing.xl` | — | Unchanged. |
| `topRow` `marginTop` | removed | — | Redundant with scroll padding. |

**Grouping rule:** the "Or make a new one" label and the ChallengeMatrix are wrapped in a single `ThemedView` with `gap: Spacing.sm`. This group is one child of the ScrollView, so the 32px outer gap spaces it from the card above, while the 8px inner gap keeps label→matrix tight. When there's no card, the group still wraps just the matrix (label omitted) — structure stays consistent.

---

## 6. Typography & Fonts (per section)

Apply the theme's `Typography` presets via `ThemedText`'s `type` prop rather than inline magic numbers. All faces are system sans (`Fonts.sans`) for cross-screen consistency — no app-wide font change in this redesign.

| Section | `type` preset | Size / LH / Weight | Overrides | Color |
|---|---|---|---|---|
| Headline | `title` | 24 / 30 / 700 | `letterSpacing: -0.24` (DESIGN.md §3b: -0.01em at 24px+) | `textPrimary` |
| Subtitle | `link` | 15 / 22 / 400 | — | `textSecondary` |
| Card title | `link` | 15 / 22 / 400 | `fontWeight: '700'` (promote to bold for card title) | `textPrimary` |
| Card subtitle | `small` | 13 / 18 / 400 | — | `textSecondary` |
| Section label | `small` | 13 / 18 / 400 | `fontWeight: '500'` (DESIGN.md §3b: 500 for section headers) | `textSecondary` |
| Chevron | — | SF Symbol 17pt | — | `textMuted` |

Weight discipline per DESIGN.md §3b: 400 body, 500 section labels, 700 titles. No 300 or 600 anywhere.

---

## 7. Component Changes

1. **`src/app/(index,vault)/index.tsx`** (edit):
   - Replace inline font styles with `type` presets + minimal overrides.
   - Update headline + subtitle copy (remove emoji, arrow glyph).
   - Increase ScrollView content `gap` to `Spacing['2xl']`.
   - Remove `topRow.marginTop`.
   - Wrap label + `ChallengeMatrix` in a grouped `ThemedView` with `gap: Spacing.sm`.
   - Conditionally render `<RecentStoryCard>` and the "Or make a new one" label when `recentStory` exists.
   - Remove the old `replayRow` ghost Button.

2. **`src/components/recent-story-card.tsx`** (new):
   - `RecentStoryCard({ story, onPress })` per §3.
   - Uses `Card`, `ThemedText`, `SymbolView`, `Colors`, `Spacing`, `Typography`.
   - Resolves protagonist name via `PROTAGONISTS.find(...)` (passed story, not profile — story stores its own `protagonist`).

3. **`src/components/challenge-matrix.tsx`** (verify-only):
   - No structural change. Confirm its internal `gap: Spacing.xl` reads calmly next to the new 32px outer rhythm; nudge to `Spacing['2xl']` only if the triggers→CTA gap feels cramped relative to the new outer gaps. Default: leave unchanged.

---

## 8. What Stays the Same

- Warm-indigo dark palette, solid `bgBase`, no gradients (DESIGN.md §7).
- `ProfileSelector` top-right (avatar emoji = profile identity, allowed).
- ChallengeMatrix 2×2 grid + trigger reveal + CTA flow (3 taps to generate).
- Motion language: `FadeInDown` 200ms, ease-out, no spring (DESIGN.md §6).
- `SafeAreaView`, `MaxContentWidth` centering, portrait-locked.
- System sans fonts app-wide (no rounded/serif introduction in this pass).

---

## 9. DESIGN.md Compliance Check

| Rule | Status |
|---|---|
| No emoji in UI chrome (§7) | ✅ Removed protagonist emoji from subtitle; removed `→` glyph from replay button. Child avatar emoji retained (identity, not chrome). |
| One accent per screen (§3a) | ✅ Accent only on selected category/trigger chips, unchanged. |
| No gradients (§7) | ✅ Solid `bgBase`. |
| Cover art 1:1, no radius, card clips (§6) | ✅ Card clips the 56×56 image. |
| Cards: rounded 16, bgSurface, no shadow (§3d) | ✅ Uses existing `Card`. |
| Tap-first, 3 taps to generate (§8.4) | ✅ Flow unchanged. |
| Weights 400/500/700 only (§3b) | ✅ See §6 table. |
| Headline tracking -0.01em at 24px+ (§3b) | ✅ `letterSpacing: -0.24`. |
| Min 24px between major sections (§3c) | ✅ 32px outer gap exceeds minimum. |
| Press feedback = elevation shift (§3d) | ✅ `Card` uses `PressableFeedback`. |

---

## 10. Testing Considerations

- **Existing workflow tests are safe:** `src/app/__tests__/story-generation-workflow.test.tsx` mocks `useStories` to `{ data: [] }`, mocks `ChallengeMatrix` and `ProfileSelector`, and never queries the headline/subtitle/replay copy. Since `recentStory` is always null in those tests, the new `RecentStoryCard` never renders there — the copy/spacing/structure changes are invisible to those assertions. No test edits required for them to keep passing.
- **New `RecentStoryCard` tests (unit):** pure-props component — render with a `Story` fixture (with and without `cover_image_url`), assert title/subtitle text and that `onPress` fires on card press. Cover-null case must render the `bgElement` placeholder square without crashing.
- **Accessibility:** card needs `accessibilityRole="button"` and a label like "Listen to {title} again" (cover art alt text is on the image; per DESIGN.md §4 the card title suffices as the visible label).

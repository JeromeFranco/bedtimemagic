# Challenge Matrix — Premium Glass Morphism Redesign

**Date:** 2026-06-19
**User Story:** US-1.2 — Challenge Matrix — Tap Selection
**Scope:** Visual redesign of existing ChallengeMatrix component + home screen integration

---

## [S1] Problem

The existing `ChallengeMatrix` component at `src/components/challenge-matrix.tsx` is functionally complete (two-tier tap selection, animated reveal, conditional Generate button) but visually flat — uniform indigo accent, basic rgba backgrounds, no category differentiation. It also isn't integrated into the home screen (`src/app/index.tsx`), which still shows a static non-functional "Generate Tonight's Story" button.

## [S2] Solution Overview

Redesign the ChallengeMatrix with:
1. **Category-specific accent colors** (blue, amber, violet, emerald) instead of uniform indigo
2. **Glass morphism** via `expo-glass-effect` GlassView (iOS blur, Android semi-transparent fallback)
3. **Refined animations** — cascading staggered reveal, scale pulses on selection
4. **Home screen integration** — replace static title/button with the interactive challenge matrix

## [S3] Color System

Each challenge category gets a unique accent color:

| Category | ID | Primary | Tint (15% opacity) |
|----------|-----|---------|---------------------|
| Screen Time Limits | `screentime` | `#60A5FA` (blue) | `rgba(96,165,250,0.15)` |
| Big Emotions / Anger | `emotions` | `#F59E0B` (amber) | `rgba(245,158,11,0.15)` |
| Bedtime Friction | `bedtime` | `#8B5CF6` (violet) | `rgba(139,92,246,0.15)` |
| Social Skills | `social` | `#34D399` (emerald) | `rgba(52,211,153,0.15)` |

Neutral (unselected) elements use `rgba(255,255,255,0.06)` background, `rgba(255,255,255,0.8)` text.

## [S4] Tier 1 Category Cards

- **Layout**: 2×2 grid, 12px gap between cards
- **Wrapper**: `GlassView` with `glassEffectStyle="regular"` + category tint color
- **Emoji**: 40pt, centered at top of card
- **Label**: Below emoji, centered, `ThemedText` default style
- **Border**: 1.5px `transparent` by default
- **Selected state**:
  - Background: category tint at 20% opacity
  - Border: category primary at 40% opacity
  - Animation: scale pulse 1.0 → 1.02 → 1.0 (200ms)
- **Card dimensions**: ~47% width (existing), increased vertical padding

## [S5] Tier 2 Trigger Chips

- **Layout**: Horizontal centered row, 8px gap
- **Wrapper**: `GlassView` with lighter category tint (8% opacity)
- **Shape**: Pill (borderRadius: 20), padding 12px horizontal, 8px vertical
- **Border**: 1px `transparent` by default
- **Text**: Category primary color at 70% opacity; white when selected
- **Selected state**:
  - Background: category tint at 25% opacity
  - Border: category primary at 30% opacity
  - Animation: scale pulse 1.0 → 1.03 → 1.0 (150ms)
- **Entrance animation**: `FadeInDown` with staggered delay (80ms per chip)
- **Exit animation**: `FadeOut` (200ms)

## [S6] Generate Button

- **Position**: Below trigger chips, full-width within matrix container
- **Background**: Solid category primary color (full opacity)
- **Text**: White, bold, 18pt
- **Border radius**: 16px
- **Padding**: 16px vertical
- **Entrance**: `FadeInUp` (250ms) when both tiers selected
- **Press state**: opacity 0.85, scale 0.98

## [S7] Home Screen Integration

**Changes to `src/app/index.tsx`:**
- Remove title ("Bedtime Magic") and subtitle ("Create a personalized story for tonight")
- Remove static "Generate Tonight's Story" button
- Render `ChallengeMatrix` as the center/filling content
- Wire `onGenerate` callback — for now, log the selection (story generation flow comes in US-1.3/US-2.1)
- Keep `ProfileSelector` at top (unchanged)

**Layout:**
```
SafeAreaView
  ProfileSelector (top)
  ChallengeMatrix (fills remaining space, scrollable)
```

## [S8] Animation Summary

| Transition | Animation | Timing |
|-----------|-----------|--------|
| Tier 2 reveal | `FadeInDown` + stagger | 300ms per chip, 80ms delay |
| Category select | Scale pulse | 200ms |
| Trigger select | Scale pulse | 150ms |
| Generate button appear | `FadeInUp` | 250ms |
| Category switch (collapse old) | `FadeOut` | 200ms |
| Category switch (reveal new) | `FadeInDown` + stagger | 300ms |

## [S9] Files to Modify

- `src/components/challenge-matrix.tsx` — Full visual redesign
- `src/app/index.tsx` — Integrate ChallengeMatrix, remove static content
- `src/constants/theme.ts` — Add category accent colors (optional, can be local to component)

## [S10] Out of Scope

- Navigation to loading screen (US-1.3)
- Story generation API call (US-2.1)
- Profile creation flow (US-3.2)
- Any interaction model changes — tap-only behavior preserved exactly as-is

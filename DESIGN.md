---
version: alpha
name: Bedtime Magic
description: Personalized audio bedtime stories for exhausted parents. Dark-only, warm-indigo, low-stimulus.
colors:
  bg-deepest: "#060A1A"
  bg-base: "#0F1328"
  bg-surface: "#171C38"
  bg-element: "#1F2545"
  bg-element-hover: "#282F55"
  bg-selected: "#2D345C"
  border-subtle: "#232848"
  border-default: "#2E3560"
  text-primary: "#E2E0F0"
  text-secondary: "#8E8AA8"
  text-muted: "#5C5878"
  success: "#7BC4A8"
  warning: "#D4A06A"
  error: "#D47A6A"
  scrim: "rgba(0, 0, 0, 0.5)"
  overlay: "rgba(6, 10, 26, 0.8)"
  track: "rgba(226, 224, 240, 0.15)"
  avatar-tint: "rgba(255, 255, 255, 0.1)"
  accent-soft: "rgba(139, 92, 246, 0.2)"
  category-screentime:
    primary: "#7EB8E0"
    tint: "rgba(126,184,224,0.12)"
    tint-light: "rgba(126,184,224,0.06)"
    tint-strong: "rgba(126,184,224,0.18)"
    tint-selected: "rgba(126,184,224,0.24)"
    text-muted: "rgba(126,184,224,0.65)"
    border: "rgba(126,184,224,0.35)"
    border-subtle: "rgba(126,184,224,0.25)"
  category-emotions:
    primary: "#D4A06A"
    tint: "rgba(212,160,106,0.12)"
    tint-light: "rgba(212,160,106,0.06)"
    tint-strong: "rgba(212,160,106,0.18)"
    tint-selected: "rgba(212,160,106,0.24)"
    text-muted: "rgba(212,160,106,0.65)"
    border: "rgba(212,160,106,0.35)"
    border-subtle: "rgba(212,160,106,0.25)"
  category-bedtime:
    primary: "#A07BD4"
    tint: "rgba(160,123,212,0.12)"
    tint-light: "rgba(160,123,212,0.06)"
    tint-strong: "rgba(160,123,212,0.18)"
    tint-selected: "rgba(160,123,212,0.24)"
    text-muted: "rgba(160,123,212,0.65)"
    border: "rgba(160,123,212,0.35)"
    border-subtle: "rgba(160,123,212,0.25)"
  category-social:
    primary: "#7BC4A8"
    tint: "rgba(123,196,168,0.12)"
    tint-light: "rgba(123,196,168,0.06)"
    tint-strong: "rgba(123,196,168,0.18)"
    tint-selected: "rgba(123,196,168,0.24)"
    text-muted: "rgba(123,196,168,0.65)"
    border: "rgba(123,196,168,0.35)"
    border-subtle: "rgba(123,196,168,0.25)"
typography:
  hero:
    fontFamily: "system-ui"
    fontSize: 40px
    lineHeight: 44px
    fontWeight: 700
    letterSpacing: -0.4px
  subtitle:
    fontFamily: "system-ui"
    fontSize: 32px
    lineHeight: 40px
    fontWeight: 700
    letterSpacing: -0.32px
  title:
    fontFamily: "system-ui"
    fontSize: 24px
    lineHeight: 30px
    fontWeight: 700
  heading:
    fontFamily: "system-ui"
    fontSize: 20px
    lineHeight: 28px
    fontWeight: 500
  body:
    fontFamily: "system-ui"
    fontSize: 17px
    lineHeight: 24px
    fontWeight: 400
  small:
    fontFamily: "system-ui"
    fontSize: 13px
    lineHeight: 18px
    fontWeight: 400
  caption:
    fontFamily: "system-ui"
    fontSize: 11px
    lineHeight: 14px
    fontWeight: 400
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  full: 9999px
spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  4xl: 64px
components:
  button-primary:
    backgroundColor: "{colors.bg-element}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: 16px 24px
  button-secondary:
    backgroundColor: transparent
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: 16px 24px
  button-ghost:
    textColor: "{colors.text-secondary}"
  chip:
    backgroundColor: "{colors.bg-element}"
    rounded: "{rounded.full}"
    height: 40px
  card:
    backgroundColor: "{colors.bg-surface}"
    rounded: "{rounded.lg}"
    padding: 16px
---

# DESIGN.md — Bedtime Magic

## Overview

A parent holding a phone at 8pm, running on fumes, needs to get from "my kid had a rough day" to a story playing in under 60 seconds — they're not browsing, they're solving a problem, and they want to tap three times and hear a story start. The visual system reads as _quiet confidence_: dark, warm, low-stimulus. Not a toy store, not a wellness-app cliché. Feels like Calm, Moshi, or Libby — never Duolingo. App shape: NativeTabs (Home + Vault), flow Home → Generate (challenge matrix + child profile) → Story player with sleep mode.

## Colors

Dark-mode-only, built around a warm indigo night sky — the sky twenty minutes after sunset. Never cold navy, never pure black; every neutral carries the warm indigo undertone. Tokens are implemented in `src/theme/*`; keep this file and those modules in sync.

- Category/accent colors are reserved for challenge chips and post-story feedback. Never as section fills, button backgrounds, or decoration.
- One accent color per screen — on the active chip or the single most important element.
- Semantic colors: `success` for confirmed actions, `warning` for usage caps and gentle alerts, `error` for critical errors (muted coral, never aggressive red).
- Contrast floor is WCAG AA (primary ≈ 11.8:1, secondary ≈ 5.0:1 on `bg-base`); every accent must be tested against `bg-base`.
- Cover art alt text describes the scene — never the words "image" or "cover art".

## Typography

System fonts only (San Francisco on iOS, Roboto on Android) — no custom font loading. This is an audio-first app; custom fonts add load time and provide no value when the primary content is spoken.

- Weight discipline: 400 for body text, 500 for labels and nav, 700 for titles and hero. Never 300 or 600 — fewer weights, less visual noise.
- Letter-spacing is applied only at hero and subtitle sizes (slightly negative tracking); all smaller sizes use default tracking.
- `link` and `code` presets exist in `src/theme/typography.ts` for edge cases but are not part of the core scale.

## Layout

- Single column, no formal grid. Content centered with a 800px max width on larger devices.
- 16px screen margins, 24px between major sections, 16px card padding, 8px chip gaps.
- Minimum 44×44pt touch targets everywhere — parents are tapping one-handed in bed.
- Safe areas via `react-native-safe-area-context`: headers sit below the inset; immersive screens (player, sleep mode) run edge-to-edge.
- Portrait-locked via `app.json` `orientation` field. The app never rotates.
- The status bar must be light-style via `expo-status-bar`; on Android keep it translucent with `bg-base` to avoid a seam. Splash is `bg-deepest` — no logo flash, no brand moment.

## Elevation & Depth

Flat design, no drop shadows — they're invisible on dark backgrounds and waste render cost. Hierarchy is conveyed by stepping the neutral scale (`bg-base` → `bg-surface` → `bg-element`) and by scrims/overlays (`scrim`, `overlay`) for modality.

## Shapes

Radius carries role: 12 for buttons, 16 for cards, pill (full) for chips. Cover art is square, displayed at 1:1 inside a card whose rounded corners clip it — no radius on the image itself.

## Components

- **Button:** Three variants — primary (`bg-element` fill), secondary (1px `border-default` border on transparent, noted here since the token schema has no borderColor property), ghost (bare text). Plus a compact size. One primary CTA per screen. No icon-only buttons, no FABs.
- **Chip:** The app's primary interactive element. Pill shape, `bg-element` unselected, category tint when selected, 1px `border-subtle`, at least 40px tall. Must feel tappable, not decorative.
- **Card:** Used sparingly (story card, lesson-log entries). 16 radius, `bg-surface`, no shadow. Everything else uses inline layout.
- **Iconography:** SF Symbols (iOS) / Material Symbols (Android), regular weight. Playback controls and navigation only — no decorative icons. Emoji appear only in post-story feedback, where they're functional input.
- **Tabs:** expo-router NativeTabs — `bg-base` bar, `bg-element` indicator, `text-primary` selected label.
- **Press feedback:** `PressableFeedback` delegates to the platform — Android ripple, iOS opacity dim. No Reanimated, no scale transforms.
- **Motion:** `withTiming` with `Easing.out`/`Easing.inOut` only — never `withSpring`. 150ms micro-interactions, 1000ms sleep-mode fade. Ease-out everywhere. The motion language is "settle" — everything slows down, nothing pops. The breathing pacer must respect `AccessibilityInfo.isReduceMotionEnabled()`.

## Do's and Don'ts

Don'ts:

- No gradient backgrounds — the background is always solid `bg-base` or `bg-deepest`.
- No bright or saturated fills; category colors appear only as low-opacity tints.
- No emoji in UI chrome (buttons, headers, empty states).
- No gamification — no streaks, badges, points, levels, or progress bars. The Lesson Log tracks behavior gently, not competitively.
- No card grids for feature display; no empty states without a primary action ("Create your first story").
- No inverted (dark-on-light) text anywhere.

When principles conflict, resolve in this order: sleep hygiene non-negotiable (cut anything that increases arousal) → accessibility floor (change the color, not the requirement) → cognitive load over density → tap-first, always → restraint over completeness → platform-native over brand-consistent.

## Voice & Tone

Warm, direct, unhurried — like a trusted friend, not a brand. UI copy stays under 8 words; instructions are one sentence; no paragraphs in UI. Address the reader as "you" — singular, direct; never "parents" or "users". Banned words: "Magic" (except in the app name), "Journey", "Unlock", "Elevate", "Seamless", "Empower", "Delight". The primary CTA is "Create Tonight's Story".

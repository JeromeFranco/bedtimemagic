# Post-Story Wind-Down UI/UX Design

**Date:** 2026-08-04  
**Status:** Approved by User  
**Target Files:** `src/components/story/story-player.tsx`, `src/components/story/wind-down.tsx`, `src/contexts/PlayerContext.tsx`, `src/app/(index,explore)/story.tsx`

---

## 1. Executive Summary & Goal

After a bedtime story finishes playing, the transition into Pillow Talk and Affirmation should feel continuous, serene, and effortless for parents and children in a dark room.

This spec defines a **Single-Surface Interactive Wind-Down Experience**:
- `StoryPlayer` stays continuously mounted from playback through Pillow Talk, Affirmation, and final Fade-to-Black.
- At story end, cover artwork smoothly scales down from 320px to 160px, placing Pillow Talk and Affirmation text in a dedicated, spacious area **below** the artwork (eliminating visual overlap).
- Interaction is gesture-driven (swipe left/up to progress), with animated semi-transparent cues ("Swipe for Affirmation →") that gently fade away.
- Finishing the session triggers a 4-second serene screen fade to 100% pitch black with a synchronized ambient audio ramp-down before returning to the main screen.

---

## 2. Layout & Visual Specifications

```
+--------------------------------------------------+
|                  (Header Faded Out)              |
+--------------------------------------------------+
|                                                  |
|                  +------------+                  |
|                  |            |                  |  <- Compact Artwork (160x160)
|                  |  Artwork   |                  |     Animated 320px -> 160px
|                  +------------+                  |
|                                                  |
|              +----------------------+            |
|              |   BreathingCircle    |            |  <- Pulsing Breathing Circle
|              |                      |            |     behind Text Below Artwork
|              | Pillow Talk /        |            |
|              | Affirmation Text     |            |
|              +----------------------+            |
|                                                  |
|            ( Swipe for Affirmation -> )          |  <- Pulsing 3s Gesture Hint
|                                                  |
|          [ Next ]      [ Skip for tonight ]      |  <- Glass Pill Buttons (Tap/Reveal)
+--------------------------------------------------+
```

### 2.1 Layout Breakdown
1. **Compact Artwork Header**:
   - During `playing`: Artwork renders at `320x320px`.
   - On transition to `pillow_talk`: Artwork smoothly resizes to `160x160px` via Reanimated `withTiming` (~1000ms, ease-out curve).
   - Positioned in top half of screen with 16px corner radius and dark background card styling.

2. **Dedicated Wind-Down Text Section (Below Artwork)**:
   - Positioned below compact artwork with generous vertical spacing (`Spacing.xl`).
   - Text rendered in warm night-sky typography (22-24px, line-height 34px, color `#E2E0F0`).
   - `BreathingCircle` (size 120px for Pillow Talk, 160px for Affirmation) pulses behind text in this lower section with zero artwork overlap.

3. **Gesture Hint & Pill Buttons**:
   - Semi-transparent hint text (*"Swipe for Affirmation →"* or *"Swipe for Goodnight ↑"*) pulses for 3 seconds then fades out.
   - Glassmorphic pill buttons ("Next", "Skip for tonight", "Goodnight") remain at the bottom for explicit touch input, auto-hiding after 5 seconds of inactivity and reappearing on tap.

---

## 3. Gesture & Motion Architecture

### 3.1 Gesture Handling (`react-native-gesture-handler`)
- **Pan Gesture**:
  - `translationX < -50` or `translationY < -50` during `pillow_talk` -> Triggers `nextFromPillowTalk()`.
  - `translationY < -50` during `affirmation` -> Triggers `startFadeToBlack()`.
- **Tap Gesture**:
  - Tapping anywhere on the screen toggles button and gesture hint visibility.

### 3.2 Animation States (Reanimated & `DESIGN.md` Compliance)
- `imageSize`: Shared value animating artwork dimension `320` -> `160` (over 1000ms).
- `dimOpacity`: Shared value animating background dimming overlay `0.0` -> `0.6` (Pillow Talk) -> `0.85` (Affirmation) -> `1.0` (Fade to Black).
- `swipeHintOpacity`: Shared value animating gesture hint `1.0` -> `0.0` (3s delay + 1000ms fade out).
- Strictly uses `.get()` and `.set()` methods per React Compiler rules in `AGENTS.md`. All curves use `withTiming` with `Easing.out(Easing.ease)` (no springs/bounce).

---

## 4. State Machine & Audio Cleanup (`PlayerContext`)

### 4.1 Flow Sequence
`playing` -> `pillow_talk` (60% dim) -> `affirmation` (85% dim) -> `fade_to_black` (100% dim) -> `done` -> `router.back()`.

### 4.2 Audio & Fade Ramping
- `PlayerContext` provides `startFadeToBlack()`:
  - Animate screen overlay `0.85` -> `1.0` over 4000ms.
  - Ramp ambient soundbed (rain/lullaby) volume `0.15` -> `0.0` over 4000ms.
  - On animation end, set `postStoryPhase` to `'done'`.
- `story.tsx` detects `postStoryPhase === 'done'` and executes `router.back()`.

---

## 5. Verification Plan

1. **Automated Static Analysis**:
   - `npm run typecheck`
   - `npm run lint`

2. **Automated Test Suite**:
   - `npm run test:ci` (verify all unit & component tests pass, including updated `PlayerContext` and `story-player` tests).

3. **Manual Verification**:
   - Verify smooth 320px -> 160px artwork resize on story end.
   - Verify zero overlap between cover art and wind-down text.
   - Verify pan left/up gestures transition Pillow Talk -> Affirmation -> Fade-to-Black.
   - Verify 4s screen fade and ambient soundbed volume ramp-down.

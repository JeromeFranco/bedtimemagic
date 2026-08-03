# Spotify-Style Unified Story Player Design

**Date:** 2026-08-03  
**Status:** Approved by user  
**Target File:** `src/app/(index,explore)/story.tsx`, `src/components/story/story-player.tsx`, `src/components/story/story-details.tsx`

---

## 1. Executive Summary & Goal

The bedtime story screen currently switches abruptly between two separate views (`StoryDetails` and `StoryPlayer`) when the user taps "Play". This unmount/mount cycle causes an unpolished jump from a top-banner image to a full-screen image with floating controls.

This design unifies the story screen into a **Spotify-Style Audio Player**: a single-screen layout where cover art, track metadata, and audio controls coexist seamlessly. Tapping "Play" starts audio playback in-place with smooth micro-interactions and no screen re-layouts.

---

## 2. Header Bar Clarification

* **Header Implementation**: The route stack in `src/app/(index,explore)/_layout.tsx` uses `headerShown: false`. The story header bar is a custom in-screen component positioned at the top of the safe area.
* **Button Press Feedback**: The back button and Sleep Mode moon button in the header will use the standard design system press feedback (`--bg-element` `#1F2545` to `--bg-element-hover` `#282F55` elevation shift over 150ms via Reanimated/`({ pressed })`), ensuring visual consistency across all touch targets in the app.

---

## 3. UI Component & Layout Specifications

```
+--------------------------------------------------+
|  [ < ] (Back)                   [ 🌙 ] (Sleep)   |  <- Safe Area Header
+--------------------------------------------------+
|                                                  |
|              +--------------------+              |
|              |                    |              |
|              |   1:1 Cover Art    |              |  <- 16px Rounded Card
|              |   (Watercolor)     |              |     Ambient scale on play
|              |                    |              |
|              +--------------------+              |
|                                                  |
|                 Story Title                      |  <- 24pt Bold `#E2E0F0`
|          Protagonist Name • Moral Text           |  <- 14pt `#8E8AA8`
|                                                  |
|        ----------------o-------------            |  <- Interactive SeekBar
|           01:24                     10:00        |
|                                                  |
|            [ -15s ]   (  ▶  )   [ +15s ]         |  <- Play/Pause (72pt)
|                                                  |
+--------------------------------------------------+
```

### 3.1 Layout Sections (Top to Bottom)

1. **Header Bar**:
   - Custom in-screen header sitting inside safe area.
   - Left: Circular back button (`chevron.backward` icon).
   - Right: Circular Sleep Mode button (`moon.fill` icon).
   - Both buttons use standard 44pt touch targets and `--bg-element` to `--bg-element-hover` press feedback.

2. **Hero Cover Card**:
   - Centered 1:1 aspect ratio square artwork with `16px` border radius (`overflow: 'hidden'`).
   - Image sizing scales cleanly based on device width with horizontal padding (`paddingHorizontal: 24`).
   - Placeholder background (`--bg-deepest`) with protagonist emoji while image loads.
   - When playing: Subtle continuous slow breathing animation (`scale: 1.0` to `1.02` with 30s duration via Reanimated `withTiming`).

3. **Track Metadata**:
   - **Title**: `24px` weight `700`, color `--text-primary` (`#E2E0F0`), center aligned.
   - **Protagonist & Moral**: `14px` weight `400`, color `--text-secondary` (`#8E8AA8`), center aligned, max 2 lines for moral with `ellipsizeMode="tail"`.

4. **Audio Scrubber Bar (`SeekBar`)**:
   - Integrated `SeekBar` showing progress, elapsed time, total duration, and drag seek handling.

5. **Playback Control Cluster**:
   - **Center**: Primary 72×72pt circular Play/Pause toggle (`--bg-element` background, `--bg-element-hover` press state).
   - **Flanking Controls**: Quick jump buttons (-15s backward, +15s forward) using SF Symbols / Material Symbols (`goforward.15` / `gobackward.15`).
   - Displays `ActivityIndicator` in place of play/pause icon when audio is buffering (`isBuffering === true`).

6. **Sleep Mode Overlay**:
   - Dark backdrop (`--bg-deepest`) overlaying the screen with `opacity` animated over 1000ms when `isSleepMode` is toggled.

---

## 4. State & Flow Architecture

* `story.tsx` manages main loading, error, cover caching, audio prefetching, and post-story phase rendering (`pillow_talk`, `affirmation`).
* Pre-play and playing states are merged into a single view.
* When `postStoryPhase` triggers (`pillow_talk` or `affirmation`), those screens continue to render as expected upon story end.

---

## 5. DESIGN.md Compliance Checklist

* [x] **Dark Mode Exclusive**: Indigo night sky palette (`#0F1328` base, `#171C38` surface, `#1F2545` element).
* [x] **Press Feedback**: Elevation step background shift with 150ms transition.
* [x] **Motion Rules**: `withTiming()` used exclusively. No spring animations or bounce.
* [x] **Touch Targets**: Minimum 44×44pt for all buttons.
* [x] **Sleep Hygiene**: Calm colors, non-distracting motion, sleep overlay for dark room listening.

---

## 6. Verification Plan

1. **Static Analysis**:
   - `npm run typecheck`
   - `npm run lint`

2. **Functional Verification**:
   - Verify story screen loads directly into Spotify player layout.
   - Verify pressing Play starts audio immediately without layout jump.
   - Verify header Back and Sleep buttons exhibit standard press feedback.
   - Verify -15s and +15s seek buttons accurately adjust player position.
   - Verify Sleep Mode overlay fades cleanly.
   - Verify post-story flow (`pillow_talk` & `affirmation`) triggers cleanly when audio finishes.

# Story Screen: Spotify-Style Layout & Shared-Element Transition

**Date:** 2026-08-03
**Status:** Approved
**Scope:** `src/app/(index,explore)/story.tsx`, `src/components/story/` (details + player components)

## 1. Problem

The story screen has two visually disconnected states. `StoryDetails` renders the cover as a full-width banner (top 55% of screen); tapping play unmounts it entirely and mounts `StoryPlayer`, a full-bleed background layout. The cover is a different `<Image>` instance in each state, so the transition is a hard cut with no visual continuity. This reads as a screen swap rather than a player expanding.

## 2. Goal

Rebuild the story screen as one continuous surface in the style of Spotify's Now Playing screen:

- Large square artwork, centered-upper, on a solid dark background
- Title + protagonist below the artwork
- Seek bar and a circular play/pause button anchored at the bottom
- Tapping play animates the same artwork element from a "pre-expanded" details configuration into the playing configuration — a true shared-element-quality morph, no remount, no crossfade between screens

## 3. Decisions Made (brainstorming)

| Decision | Choice |
| --- | --- |
| What to borrow from Spotify | Both layout and transition |
| Playing-state background | Solid dark (`bg-base`), DESIGN.md-compliant; no blurred image background |
| Artwork framing | Large, centered-upper (~screen width − 48px when playing); not shrunk |
| Playing-state content under artwork | Title + protagonist only; moral fades out on play |
| Artwork motion during playback | Static (Ken Burns zoom removed) |
| Play button | Circular play/pause in both states (Spotify-style) |
| Implementation approach | One unified component with animated layout values (approach A); no new dependencies |

## 4. Layout

Both states share one skeleton. Background is solid `bg-base` in both states — no scrim, no image background.

```
┌─────────────────────────┐  ┌─────────────────────────┐
│ ‹                   [☾] │  │ ‹                   [☾] │
│                         │  │   ┌─────────────────┐   │
│      ┌───────────┐      │  │   │                 │   │
│      │  artwork  │      │  │   │    artwork      │   │
│      │  (small)  │      │  │   │    (large)      │   │
│      └───────────┘      │  │   │                 │   │
│  Title                  │  │   └─────────────────┘   │
│  Protagonist            │  │  Title                  │
│                         │  │  Protagonist            │
│  Moral fades out ──┐    │  │                         │
│                    ↕    │  │  ▬▬▬▬▬●▬▬▬▬▬  2:31/9:45 │
│  Seek bar fades in ─┘   │  │                         │
│         ( ▶ )           │  │         ( ⏸ )           │
└─────────────────────────┘  └─────────────────────────┘
        DETAILS                      PLAYING
```

### Elements

- **Top bar:** back chevron (top-left) in both states; sleep-mode moon button (top-right) fades in on play. Both 44×44pt, `rgba(6,10,26,0.6)` fill (unchanged from today).
- **Artwork:** square, horizontally centered, no border radius (DESIGN.md). Playing size: `screenWidth − 48`. Details size: 85% of playing size, sitting ~24px lower. Image error/missing shows the protagonist emoji placeholder inside the same square container.
- **Text block:** title 24px/700, protagonist 13px `textSecondary` below it, left-aligned with 24px horizontal padding. Same order in both states (title-first; this changes details from today's protagonist-first order). Because order matches, the block glides with the artwork — no reordering.
- **The band:** a fixed-height slot (~48px) above the play button. Details: moral text (15px `textSecondary`). Playing: SeekBar with timestamps. The two crossfade in place.
- **Play button:** 80px circle, `bg-element` fill (press state `bg-elementHover`), horizontally centered, bottom-anchored above the safe-area inset. Same position in both states — it is the fixed anchor of the transition. Shows buffering spinner until audio is ready. Accessibility labels: "Play story" (details/paused) / "Pause" (playing).

## 5. Transition Choreography

One shared value, `expand` (0 → 1), drives everything. On play tap: `expand.set(withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) }))`. On reduced motion: set instantly.

Driven by `expand` via `interpolate()` inside `useAnimatedStyle`:

1. Artwork `scale: 0.85 → 1`, `translateY: +24 → 0`
2. Text block `translateY` follows (computed from the same value)
3. Band crossfade: moral `opacity 1 → 0`, SeekBar `opacity 0 → 1` (200ms window inside the 350ms)
4. Sleep-mode button `opacity 0 → 1`

Audio starts immediately on tap (`playStory(story)`); the button shows the buffering spinner until ready.

**No reverse animation.** Back during playback stops the story and exits (`router.back()`), same as today.

## 6. Animation Performance Requirements

The transition must be transform-only — no per-frame layout work:

- **Artwork renders at full playing size from mount.** Details state is `transform: [{ scale: 0.85 }, { translateY: 24 }]`. Scaling down keeps the image crisp and avoids any upscale blur. Playing animates transforms only.
- **Text block and band** move via `translateY` interpolated from the same `expand` value. All transforms.
- **Band crossfade is opacity-only** inside the fixed-height slot. Moral stays mounted at opacity 0 with `pointerEvents: 'none'` during playing; SeekBar mounts on play and fades in. Nothing unmounts mid-animation; no layout shift.
- **UI thread only.** `useSharedValue` + `withTiming` + `useAnimatedStyle` + `interpolate()`. No JS-thread round trips. The phase flip causes exactly one React re-render; the animation itself causes none.
- **Shared values via `.get()`/`.set()`** (React Compiler rule from AGENTS.md).
- **Same `<Image>` instance, same cached `file://` source** through both states — no re-decode, no flicker.
- **Ken Burns `withRepeat` removed** — zero continuous animations during playback.

Verification: on-device check that the morph runs at 60fps with no dropped frames.

## 7. Architecture

- **New:** `src/components/story/story-screen.tsx` — the merged component. Owns the `details | playing` phase internally. Props: `story`, `protagonist`, `imageSource`. No `onBack` prop — exit is handled internally (`usePlayer().stopStory` + `router.back()`), with `stopStory` called only when in the playing phase.
- **Delete:** `src/components/story/story-details.tsx`, `src/components/story/story-player.tsx`, and their tests (`story-details.test.tsx`, `story-player.test.tsx`).
- **Modify:** `src/app/(index,explore)/story.tsx` — gets thinner. Keeps data fetching, cover caching, audio prefetch, and post-story phases (pillow talk / affirmation / done). Removes the `details | playing` phase state; renders `<StoryScreen>` for both pre-playback states.

Carried over unchanged: sleep-mode overlay (fade to 0.92 opacity over 1000ms), controls auto-hide after 5s with tap-to-toggle, buffering spinner, image error fallback, `stopStory()` on unmount, audio prefetch and cover caching.

## 8. Edge Cases

- **Reduced motion:** `AccessibilityInfo.isReduceMotionEnabled()` → `expand` set instantly (no movement); band swaps with a quick fade.
- **Image error/missing:** emoji placeholder in the same square container; scales identically.
- **Buffering:** spinner inside the circular button until audio ready (existing behavior).
- **Controls hidden (playing):** top bar, band, and play button fade out after 5s; artwork + title remain. Tap anywhere restores.
- **Back during playback:** stop + exit; no reverse morph.

## 9. DESIGN.md Deviations (to be recorded in DESIGN.md)

1. **Circular icon-only play button in the details state.** DESIGN.md forbids icon-only buttons, but icons are sanctioned for playback controls; the button carries a full accessibility label.
2. **350ms shared-element morph** added to the motion language (DESIGN.md specifies 200ms crossfades for screen transitions; this is a layout morph, still ease-out, no spring/bounce).
3. **Title-first text order** (Spotify order) replaces details' protagonist-first order.

## 10. Testing

- New suite: `src/components/story/__tests__/story-screen.test.tsx`
  - Renders details state: moral visible, SeekBar absent/hidden, play button labeled "Play story"
  - Play tap → playing state: SeekBar visible, sleep-mode button visible, phase animated
  - Pause/resume toggling
  - Buffering spinner while audio not ready
  - Back button callbacks (details exit; playing exit stops story)
  - Sleep-mode toggle
  - Reduced-motion path (mock `AccessibilityInfo`)
  - Image error → placeholder
- Update `src/app/__tests__/story.test.tsx` for the thinner route component
- Delete retired suites with their components
- Gates: `npm run lint`, `npm run typecheck`, full jest run green

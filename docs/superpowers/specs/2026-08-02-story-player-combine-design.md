# Combine Story + Player into a Single Screen

**Date:** 2026-08-02
**Status:** Approved

## Problem

The current flow requires two navigations to listen to a story: story card → `story.tsx` (details + "Play" button) → `player.tsx` (audio playback). The story screen is essentially a landing page for the player, and the post-story flow awkwardly dumps users back onto it after the affirmation. This adds friction for exhausted parents who want to tap and hear a story start.

## Solution

Merge `player.tsx` into `story.tsx` as a single screen with internal phase management. The player becomes a set of components rendered within the story screen. The `/player` route is deleted.

## Flow

```
Open story → Details view → Tap Play → Immersive player → Story ends
→ Pillow talk (if prompt exists) → Affirmation (if exists) → router.back() to list
```

Phase derivation:

```
if postStoryPhase === 'pillow_talk'     → PillowTalk
else if postStoryPhase === 'affirmation' → Affirmation
else if postStoryPhase === 'done'       → router.back() (side effect)
else if phase === 'playing'             → Immersive player
else                                    → Story details
```

Note: `fading` and `idle` fall through to the `phase === 'playing'` or details branch respectively. `fading` is audio-only (volume ramp handled by PlayerContext); the player UI remains visible during the fade.

Back button behavior:
- Details: `router.back()`
- Playing: `stopStory()` + `router.back()`
- Post-story phases: no back button (exits are "Next"/"Skip"/"Goodnight")

## Details Phase UI

Layout (top to bottom):

- **Cover image** — full-width, edge-to-edge at top, ~55% of screen height, `resizeMode="cover"`. Hard cut to solid `bg-base` below (no gradient, no scrim). While cover art is generating, placeholder shows protagonist emoji centered on `bg-deepest`.
- **Back button** — overlaid top-left on the image, inside safe area. 44x44 tap target on a solid circular scrim (`rgba(6,10,26,0.6)`). Native icon via `expo-symbols`: `{ ios: 'chevron.backward', android: 'arrow_back' }`, size 24, weight regular, tint `text-primary`.
- **Content area** — 24px horizontal padding:
  - Protagonist name: 13px, `text-secondary`, weight 400 (no emoji)
  - Title: 24px, weight 700, `text-primary`, -0.01em tracking
  - Moral: 15px, weight 400, `text-secondary`, line-height 22
  - Play button: Primary variant — full-width, `bg-element` fill, rounded 12, 17px weight 500 `text-primary`. Press: bg shift to `bg-element-hover`, 150ms `withTiming`. Label: "Play Story".
- **Entrance motion** — opacity 0→1, translateY 8→0, 200ms ease-out `withTiming`. Disabled under `AccessibilityInfo.isReduceMotionEnabled()`.
- **Loading state** — ActivityIndicator + "Loading story..." centered on `bg-base`.
- **Error state** — "Couldn't load this story" + Secondary button "Go Back".

## Playing Phase UI (Immersive Player)

- **Background** — cover image full-screen, edge-to-edge under status bar (immersive screen rule). Solid warm-indigo scrim `rgba(6,10,26,0.55)`. Ambient motion: artwork scale 1.0↔1.03 on a 60s `withRepeat(withTiming)` loop. Disabled under reduced motion.
- **Title** — 40px, weight 700, centered (DESIGN.md hero moment). Protagonist label 13px `text-secondary` beneath. Fades with controls.
- **Top bar** — back chevron (left, same scrim circle), sleep mode toggle (right). Icons via `expo-symbols`:
  - Back: `{ ios: 'chevron.backward', android: 'arrow_back' }`
  - Sleep: `{ ios: 'moon.fill', android: 'bedtime' }`
- **Sleep mode** — toggling fades screen to near-black (`bg-deepest` at 0.92 opacity) over 1000ms. Controls hide; tapping the screen toggles control visibility only (does not exit sleep mode — only the moon button does that).
- **Play/pause** — 80px circle, `bg-element` fill, press shifts to `bg-element-hover` (150ms). Icons: `{ ios: 'play.fill', android: 'play_arrow' }` / `{ ios: 'pause.fill', android: 'pause' }`. Buffering: small ActivityIndicator replaces icon.
- **Seek bar** — draggable via `react-native-gesture-handler` PanGestureHandler on thumb, tap-to-seek on track. Thumb 14px → 18px while dragging (150ms `withTiming`). Track 4px, fill `text-primary`. Time labels 11px `text-secondary`.
- **Controls visibility** — auto-hide after 5s, fade over 200ms via animated opacity (not mount/unmount). Tap anywhere toggles.

## Post-Story Phases

### Pillow Talk

- Background: cover image + warm-indigo dimming at 0.8 opacity, brightness fade-in over 2000ms
- BreathingCircle behind text (size 120)
- Prompt text: 24px, weight 400, `text-primary`, centered, line-height 36
- "Next" — Primary button (bg-element, rounded 12, full-width)
- "Skip for tonight" — Secondary button (transparent, 1px `border-default`, `text-secondary`, rounded 12)
- Controls auto-hide after 15s, tap to toggle

### Affirmation

- Solid `bg-deepest` background
- BreathingCircle size 200, centered
- Affirmation text: 24px, weight 400, `text-primary`, line-height 36, centered
- "Goodnight" — Primary button, full-width
- On tap: `confirmAffirmation()` → `done` → `router.back()`

## Icon Strategy

All icons use `expo-symbols` `SymbolView` (already installed). SF Symbols on iOS, Material Symbols on Android. Size 24, weight regular, tint `Colors.dark.textPrimary`.

| Purpose | iOS | Android |
|---------|-----|---------|
| Back | `chevron.backward` | `arrow_back` |
| Play | `play.fill` | `play_arrow` |
| Pause | `pause.fill` | `pause` |
| Sleep mode | `moon.fill` | `bedtime` |

## Component Structure

```
src/app/(index,explore)/story.tsx        — orchestrator (~100 lines): loads story,
                                            derives phase, renders component,
                                            stopStory() on unmount, prefetch audio
src/components/story/story-details.tsx   — details phase view
src/components/story/story-player.tsx    — immersive player (uses usePlayer() directly)
src/components/story/seek-bar.tsx        — draggable seek bar + time labels
src/components/story/pillow-talk.tsx     — pillow talk phase
src/components/story/affirmation.tsx     — affirmation phase
```

Deleted:
- `src/app/(index,explore)/player.tsx`
- `src/app/__tests__/player.test.tsx` (tests migrate)

Updated:
- `src/app/(index,explore)/_layout.tsx` — remove `<Stack.Screen name="player" />`
- `src/app/__tests__/story.test.tsx` — play button triggers in-place playback, not navigation

Key simplification: no `hasAutoPlayed` ref / auto-play-on-mount. Playback starts only on explicit tap.

## Testing

- Migrate player.test.tsx cases to component tests: play/pause toggle, seek, sleep mode dimming, pillow talk skip/next, affirmation → back navigation
- New: seek-bar drag gesture test (PanGestureHandler mock)
- Updated story.test.tsx: loading state, error state, play button triggers `playStory()` + phase change, back button navigates
- PlayerContext tests untouched (context logic unchanged)

## Design System Compliance

All decisions follow DESIGN.md:
- No gradients — solid backgrounds and scrims only
- No emoji in UI chrome — proper icons via expo-symbols
- Two button variants only (Primary: bg-element fill; Secondary: transparent + border)
- Press feedback: background elevation shift, 150ms withTiming
- Motion: withTiming only, ease-out, no spring/bounce
- Type scale: 11/13/15/17/20/24/32/40 (40px = player title hero moment)
- Sleep mode: 1000ms fade to bg-deepest
- Immersive screens: edge-to-edge under status bar
- Reduced motion: all ambient/entrance animations disabled
- Touch targets: minimum 44x44pt

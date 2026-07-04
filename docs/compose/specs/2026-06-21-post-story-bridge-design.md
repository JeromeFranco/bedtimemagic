# Post-Story Bridge Design Spec

**Feature:** US-1.7 (Pillow Talk) + US-1.8 (Affirmation) — Post-Story Bridge
**Date:** 2026-06-21
**Status:** Draft

## [S1] Problem

When story audio finishes playing, the player screen silently resets to idle. There is no transition to reinforce the story's lesson or provide a calming send-off. The PRD defines a "Post-Story Bridge" flow (§4.2 step 5) that should guide parent and child from story completion through reflection to sleep — but none of this is built.

The data layer already supports it: `Story.pillow_talk_prompt` and `Story.sleepy_affirmation` exist in the database and TypeScript type, but are unused in any UI.

## [S2] Solution Overview

Extend the player screen with an in-player state machine that transitions through post-story phases after audio playback completes. No new routes — the existing `/player` screen absorbs the entire bridge flow.

**Scope:**
- Audio fade to silence (3 seconds)
- Pillow Talk prompt screen
- Sleepy Affirmation screen with breathing animation
- Skip pillow talk → go directly to affirmation

**Descoped:**
- 15-minute white noise sleep timer
- App locking mechanism
- Ambient noise audio
- Lesson log feedback (3 emojis) — `logStoryRating()` API remains unused

## [S3] State Machine

The player screen operates in phases managed by PlayerContext:

```
PLAYING → FADING → PILLOW_TALK → AFFIRMATION → DONE
                        ↓ (skip)
                     AFFIRMATION → DONE
```

| Phase | Description |
|-------|-------------|
| `idle` | No story loaded (default) |
| `playing` | Audio playback in progress (existing behavior) |
| `fading` | 3-second volume fade to silence, then auto-advance |
| `pillow_talk` | Shows `pillow_talk_prompt` with Next/Skip buttons |
| `affirmation` | Shows `sleepy_affirmation` with breathing circle and Goodnight button |
| `done` | Cleanup and `router.back()` to home |

### Transitions

- `playing → fading`: Triggered by `didJustFinish` event from expo-audio
- `fading → pillow_talk`: Auto after 3-second fade completes
- `pillow_talk → affirmation`: "Next" button tap
- `pillow_talk → affirmation`: "Skip" button tap (skips pillow talk only)
- `affirmation → done`: "Goodnight" button tap
- `done → idle`: Cleanup, navigate back

## [S4] PlayerContext Changes

**New state field:**
```typescript
postStoryPhase: 'idle' | 'fading' | 'pillow_talk' | 'affirmation' | 'done'
```

**New methods:**
```typescript
skipPillowTalk(): void    // jumps to affirmation
confirmAffirmation(): void // sets done, triggers navigation
```

**Modified `didJustFinish` handler:**
Instead of resetting all state immediately, set `postStoryPhase = 'fading'` and begin the volume fade. The fade uses expo-audio's `setVolumeAsync` called via a 50ms interval over 3 seconds (60 steps from 1.0 → 0.0). On fade completion, set `postStoryPhase = 'pillow_talk'`.

**Reset behavior:** When `postStoryPhase` transitions to `done`, the existing cleanup logic runs (reset story, position, etc.) and `router.back()` is called from the player screen. If the user navigates away during any bridge phase (back button, gesture), `postStoryPhase` resets to `idle` on unmount via the existing cleanup effect.

## [S5] Player Screen UI

The player screen conditionally renders based on `postStoryPhase`:

### During `playing` (existing)
No changes. Cover art, controls, seek bar, sleep mode toggle.

### During `fading`
No visual change. Audio volume animates down. Screen stays as-is (dimmed playback view).

### During `pillow_talk`
- Background: Cover art with increased dimming overlay (darker)
- Breathing circle: Subtle, positioned behind text (reuse `BreathingCircle` with configurable size prop)
- Text: `story.pillow_talk_prompt` — large, centered, low-contrast white/purple
- Buttons: "Next" (primary, bottom) and "Skip for tonight" (ghost text button below Next)
- Gentle brightness ramp: overlay opacity animates from 0.9 → 0.7 over 1 second on mount
- Controls auto-hide: Buttons fade out after 15s of inactivity, tap anywhere to reveal

### During `affirmation`
- Background: Deep navy/purple gradient (cover art fully dimmed out)
- Breathing circle: Large (200px), centered, prominent focal point
- Text: `story.sleepy_affirmation` — centered, calming font
- Single button: "Goodnight" (primary, bottom)
- Breathing circle pulses slowly (existing 4s cycle)

### During `done`
Screen transitions out via `router.back()`.

## [S6] BreathingCircle Enhancement

Add optional props to the existing component:

```typescript
interface BreathingCircleProps {
  size?: number;   // default: 120
  color?: string;  // default: 'rgba(139, 92, 246, 0.2)'
}
```

The shadow color stays fixed as purple (`#8B5CF6`) regardless of the fill color prop — it provides consistent ambient glow. The `color` prop only changes the fill opacity/color of the circle itself.

## [S7] Visual Design

**Color palette** (consistent with existing dark theme):
- Background: `#0F0D1A` (deep navy, existing)
- Text primary: `rgba(255, 255, 255, 0.85)` (low-contrast white)
- Text secondary: `rgba(139, 92, 246, 0.7)` (muted purple)
- Button primary: `#8B5CF6` (existing purple accent)
- Button ghost: transparent with purple border

**Typography:**
- Prompt text: 24px, font-weight 300 (light), line-height 36px
- Affirmation text: 28px, font-weight 300, line-height 40px
- Button text: 18px, font-weight 500

**Animations:**
- Fade transitions: 800ms duration (matches existing `CalmingCopy` pattern)
- Brightness ramp: 1000ms ease-out
- Button auto-hide: 15s timeout, 400ms fade

## [S8] Error Handling

- If `story.pillow_talk_prompt` is empty/null: skip pillow talk phase, go directly to affirmation
- If `story.sleepy_affirmation` is empty/null: skip affirmation, go directly to done
- If fade is interrupted (user backgrounds app): complete fade immediately, advance to pillow talk

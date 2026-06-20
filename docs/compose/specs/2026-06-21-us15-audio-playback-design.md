# US-1.5: Audio Playback — Wind-Down Phase Design

**Date:** 2026-06-21
**Status:** Approved
**User Story:** US-1.5 from `docs/user-stories.md`

---

## [S1] Problem

US-1.5 requires an audio playback screen (Wind-Down Phase) where story audio plays with the cover art as a dimmed background, minimal playback controls, and background audio support. The current `PlayerContext` is a skeleton with no audio engine, and `expo-audio` is installed but unused. The TTS pipeline (US-2.2) is not yet built, so we use a mock audio source with a clean swap point for future integration.

## [S2] Architecture Decision

**Approach: PlayerContext as audio engine.**

The expanded `PlayerContext` owns the `expo-audio` `AudioPlayer` instance directly. No separate audio service or custom hook — the context is the single consumer of audio, and adding a service layer is premature abstraction. If extraction is needed later (e.g., mini-player in other screens), we refactor then.

## [S3] PlayerContext Redesign

**Location:** `src/contexts/PlayerContext.tsx`

### State Additions

| Field | Type | Description |
|-------|------|-------------|
| `position` | `number` | Current playback position in seconds |
| `duration` | `number` | Total audio duration in seconds |
| `isBuffering` | `boolean` | True while audio is loading/buffering |

### Method Additions

| Method | Signature | Description |
|--------|-----------|-------------|
| `pause` | `() => void` | Pause playback |
| `resume` | `() => void` | Resume playback |
| `seekTo` | `(seconds: number) => void` | Seek to position |

### Interface

```typescript
interface PlayerContextValue {
  currentStory: Story | null;
  isPlaying: boolean;
  isBuffering: boolean;
  isSleepMode: boolean;
  position: number;
  duration: number;
  playStory: (story: Story) => void;
  pause: () => void;
  resume: () => void;
  seekTo: (seconds: number) => void;
  stopStory: () => void;
  toggleSleepMode: () => void;
}
```

### Behavior

- `playStory(story)` creates an `AudioPlayer` from expo-audio using the story's audio URI (resolved via `getAudioSource()`)
- On player creation, register `playbackStatusUpdate` event listeners to track position, duration, and playback state
- On story change or `stopStory()`, unload the previous player and clean up listeners
- Audio session configured for background playback on iOS (`UIBackgroundModes: audio` in app.json)
- expo-audio handles audio session category internally when a player is created

## [S4] Playback Screen

**Route:** `src/app/player.tsx` — pushed from story card when "Play Story" is tapped.

### Layout (full-screen, dark)

- **Background:** Cover art image stretched to fill screen
- **Dimming overlay:** Semi-transparent dark overlay (~50% opacity) over cover art
- **Top area:** Story title (subtle, reduced opacity) + protagonist emoji
- **Center:** Large play/pause button (circular, glass-morphism style matching existing design from `story.tsx`)
- **Bottom area:** Minimal seek bar with time labels (current position / total duration)
- **Top-right corner:** Sleep mode toggle button (moon icon)

### Interactions

- Play/pause button toggles playback
- Seek bar: draggable thumb, shows elapsed/remaining time using existing `formatDuration()` utility
- Sleep mode button: toggles `isSleepMode` in context (US-1.6 will add full screen-black behavior)
- Controls auto-hide after 5 seconds of inactivity; tapping screen toggles visibility
- Back gesture/button stops playback and returns to story card

### Navigation

- `story.tsx` "Play Story" button → `router.push('/player', { story: storyJson })`
- Player screen loads story from route params, calls `playStory(story)` on mount
- Cleanup: `stopStory()` called on unmount

## [S5] Background Audio Configuration

### app.json Changes

- iOS: Add `UIBackgroundModes: ["audio"]` to `ios.infoPlist`
- expo-audio plugin already registered — no change needed

### Audio Session Behavior

- Audio continues when app is backgrounded
- Audio pauses on phone call interruption, resumes after
- Audio stops when `stopStory()` is called or screen unmounts

## [S6] Mock Audio Strategy

### For Testing Without Real TTS

1. Add a sample MP3 file to `assets/audio/sample-story.mp3` (1-2 min calm audio)
2. Create `src/lib/audio-utils.ts` with `getAudioSource(story: Story): string`
   - Returns local asset URI for mock phase
   - Later: returns cached file path if exists, else streaming URL from Edge Function
3. PlayerContext uses this helper to resolve audio URI

### Future TTS Integration Point

`getAudioSource()` is the single swap point. When US-2.2 lands, change this function to return the real streaming URL or cached file path. No other code changes needed in PlayerContext or playback screen.

## [S7] File Structure & Scope

### New Files

| File | Purpose |
|------|---------|
| `src/app/player.tsx` | Playback screen |
| `src/lib/audio-utils.ts` | `getAudioSource()` helper |
| `assets/audio/sample-story.mp3` | Mock audio file |
| `src/app/__tests__/player.test.tsx` | Playback screen tests |

### Modified Files

| File | Changes |
|------|---------|
| `src/contexts/PlayerContext.tsx` | Expanded with expo-audio integration, new state/methods |
| `src/app/story.tsx` | Update "Play Story" to push to `/player` route |
| `app.json` | Add iOS background audio mode |

### Out of Scope

- US-1.6: Sleep mode (screen black, audio continues)
- US-1.7/1.8: Post-story bridge (pillow talk, affirmation, timer)
- US-1.9: Sentence-level streaming & caching
- US-2.2: Real TTS pipeline

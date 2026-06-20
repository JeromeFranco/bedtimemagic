# US-1.5: Audio Playback — Wind-Down Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the audio playback screen with expo-audio integration, cover art background, dimming overlay, and minimal playback controls.

**Architecture:** PlayerContext expanded to own an expo-audio `AudioPlayer` instance created via `createAudioPlayer()`. Playback screen at `/player` route uses context for state. Mock audio via bundled MP3, with `getAudioSource()` as the single swap point for future TTS integration.

**Tech Stack:** expo-audio, React Context, Expo Router, react-native-reanimated

---

### Task 1: Background Audio Configuration

**Covers:** S5

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Add iOS background audio mode to app.json**

Read `app.json` and add `UIBackgroundModes: ["audio"]` to `ios.infoPlist`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["audio"]
      }
    }
  }
}
```

If `ios` or `infoPlist` already exists, merge the `UIBackgroundModes` key into it. Do not overwrite existing keys.

- [ ] **Step 2: Verify app.json is valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('app.json','utf8')); console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add app.json
git commit -m "feat: add iOS background audio mode to app.json"
```

---

### Task 2: Audio Utilities

**Covers:** S6

**Files:**
- Create: `src/lib/audio-utils.ts`
- Test: `src/lib/__tests__/audio-utils.test.ts`

- [ ] **Step 1: Write tests for getAudioSource**

```typescript
// src/lib/__tests__/audio-utils.test.ts
import { getAudioSource } from '../audio-utils';
import type { Story } from '@/types';

const MOCK_STORY: Story = {
  id: 'story-1',
  user_id: 'user-1',
  child_id: 'child-1',
  title: 'Test Story',
  story_text: 'Once upon a time...',
  moral: 'Be kind.',
  pillow_talk_prompt: 'What was your favorite part?',
  sleepy_affirmation: 'I am brave.',
  cover_image_url: null,
  challenge: 'refusing_teeth',
  protagonist: 'barnaby',
  created_at: '2026-06-21T00:00:00Z',
};

describe('getAudioSource', () => {
  it('returns an object with uri property', () => {
    const source = getAudioSource(MOCK_STORY);
    expect(source).toHaveProperty('uri');
    expect(typeof source.uri).toBe('string');
  });

  it('returns consistent source for same story', () => {
    const source1 = getAudioSource(MOCK_STORY);
    const source2 = getAudioSource(MOCK_STORY);
    expect(source1).toEqual(source2);
  });

  it('returns same mock URI regardless of story', () => {
    const source1 = getAudioSource(MOCK_STORY);
    const source2 = getAudioSource({ ...MOCK_STORY, id: 'story-2' });
    expect(source1.uri).toBe(source2.uri);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/__tests__/audio-utils.test.ts --no-cache`
Expected: FAIL with "Cannot find module '../audio-utils'"

- [ ] **Step 3: Implement getAudioSource**

```typescript
// src/lib/audio-utils.ts
import type { Story } from '@/types';

const SAMPLE_AUDIO = require('../../assets/audio/sample-story.mp3');

export function getAudioSource(story: Story): { uri: string } {
  // Mock phase: return bundled sample audio.
  // When US-2.2 lands, swap to: cached file path or streaming URL.
  return { uri: SAMPLE_AUDIO };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/__tests__/audio-utils.test.ts --no-cache`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio-utils.ts src/lib/__tests__/audio-utils.test.ts
git commit -m "feat: add audio utility with mock source for playback testing"
```

---

### Task 3: Sample Audio Asset

**Covers:** S6

**Files:**
- Create: `assets/audio/sample-story.mp3`

- [ ] **Step 1: Add a sample MP3 file**

Place any calm/ambient MP3 file (~30-60 seconds) at `assets/audio/sample-story.mp3`. This is a mock audio source for testing playback. Any MP3 will work — it just needs to be a valid audio file for expo-audio to load.

If no MP3 is available, create a minimal silent MP3 using ffmpeg:

```bash
mkdir -p assets/audio
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 30 -q:a 9 -acodec libmp3lame assets/audio/sample-story.mp3
```

- [ ] **Step 2: Verify file exists and is valid**

Run: `file assets/audio/sample-story.mp3`
Expected: `Audio file` or similar

- [ ] **Step 3: Commit**

```bash
git add assets/audio/sample-story.mp3
git commit -m "chore: add sample audio asset for playback testing"
```

---

### Task 4: Expand PlayerContext with expo-audio

**Covers:** S3

**Files:**
- Modify: `src/contexts/PlayerContext.tsx`
- Test: `src/contexts/__tests__/PlayerContext.test.tsx`

- [ ] **Step 1: Write tests for expanded PlayerContext**

```typescript
// src/contexts/__tests__/PlayerContext.test.tsx
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text, Button } from 'react-native';
import { PlayerProvider, usePlayer } from '../PlayerContext';
import type { Story } from '@/types';

jest.mock('expo-audio', () => {
  const mockPlayer = {
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn(),
    addListener: jest.fn((_event: string, cb: Function) => {
      // Simulate loaded status immediately
      cb({
        currentTime: 0,
        duration: 120,
        playing: false,
        isBuffering: false,
        isLoaded: true,
        didJustFinish: false,
      });
      return { remove: jest.fn() };
    }),
    replace: jest.fn(),
  };
  return {
    createAudioPlayer: jest.fn(() => mockPlayer),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  };
});

const MOCK_STORY: Story = {
  id: 'story-1',
  user_id: 'user-1',
  child_id: 'child-1',
  title: 'Test Story',
  story_text: 'Once upon a time...',
  moral: 'Be kind.',
  pillow_talk_prompt: 'What was your favorite part?',
  sleepy_affirmation: 'I am brave.',
  cover_image_url: null,
  challenge: 'refusing_teeth',
  protagonist: 'barnaby',
  created_at: '2026-06-21T00:00:00Z',
};

function TestComponent() {
  const {
    currentStory,
    isPlaying,
    isBuffering,
    isSleepMode,
    position,
    duration,
    playStory,
    pause,
    resume,
    seekTo,
    stopStory,
    toggleSleepMode,
  } = usePlayer();

  return (
    <>
      <Text testID="story">{currentStory?.title ?? 'none'}</Text>
      <Text testID="playing">{String(isPlaying)}</Text>
      <Text testID="buffering">{String(isBuffering)}</Text>
      <Text testID="sleep">{String(isSleepMode)}</Text>
      <Text testID="position">{position}</Text>
      <Text testID="duration">{duration}</Text>
      <Button testID="play" title="Play" onPress={() => playStory(MOCK_STORY)} />
      <Button testID="pause" title="Pause" onPress={() => pause()} />
      <Button testID="resume" title="Resume" onPress={() => resume()} />
      <Button testID="seek" title="Seek" onPress={() => seekTo(30)} />
      <Button testID="stop" title="Stop" onPress={() => stopStory()} />
      <Button testID="sleep-toggle" title="Sleep" onPress={() => toggleSleepMode()} />
    </>
  );
}

function renderWithProvider() {
  return render(
    <PlayerProvider>
      <TestComponent />
    </PlayerProvider>
  );
}

describe('PlayerContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has correct initial state', () => {
    const { getByTestId } = renderWithProvider();
    expect(getByTestId('story').props.children).toBe('none');
    expect(getByTestId('playing').props.children).toBe('false');
    expect(getByTestId('sleep').props.children).toBe('false');
    expect(getByTestId('duration').props.children).toBe(0);
  });

  it('sets story and starts playing on playStory', () => {
    const { getByTestId } = renderWithProvider();
    act(() => getByTestId('play').props.onPress());
    expect(getByTestId('story').props.children).toBe('Test Story');
    expect(getByTestId('playing').props.children).toBe('true');
  });

  it('pauses playback', () => {
    const { getByTestId } = renderWithProvider();
    act(() => getByTestId('play').props.onPress());
    act(() => getByTestId('pause').props.onPress());
    expect(getByTestId('playing').props.children).toBe('false');
  });

  it('resumes playback', () => {
    const { getByTestId } = renderWithProvider();
    act(() => getByTestId('play').props.onPress());
    act(() => getByTestId('pause').props.onPress());
    act(() => getByTestId('resume').props.onPress());
    expect(getByTestId('playing').props.children).toBe('true');
  });

  it('stops story and clears state', () => {
    const { getByTestId } = renderWithProvider();
    act(() => getByTestId('play').props.onPress());
    act(() => getByTestId('stop').props.onPress());
    expect(getByTestId('story').props.children).toBe('none');
    expect(getByTestId('playing').props.children).toBe('false');
  });

  it('toggles sleep mode', () => {
    const { getByTestId } = renderWithProvider();
    expect(getByTestId('sleep').props.children).toBe('false');
    act(() => getByTestId('sleep-toggle').props.onPress());
    expect(getByTestId('sleep').props.children).toBe('true');
    act(() => getByTestId('sleep-toggle').props.onPress());
    expect(getByTestId('sleep').props.children).toBe('false');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/contexts/__tests__/PlayerContext.test.tsx --no-cache`
Expected: FAIL with missing exports or interface errors

- [ ] **Step 3: Implement expanded PlayerContext**

```typescript
// src/contexts/PlayerContext.tsx
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer, AudioStatus } from 'expo-audio';
import type { Story } from '@/types';
import { getAudioSource } from '@/lib/audio-utils';

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

const PlayerContext = createContext<PlayerContextValue>({
  currentStory: null,
  isPlaying: false,
  isBuffering: false,
  isSleepMode: false,
  position: 0,
  duration: 0,
  playStory: () => {},
  pause: () => {},
  resume: () => {},
  seekTo: () => {},
  stopStory: () => {},
  toggleSleepMode: () => {},
});

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSleepMode, setIsSleepMode] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const playerRef = useRef<AudioPlayer | null>(null);
  const listenerRef = useRef<{ remove: () => void } | null>(null);

  const cleanupPlayer = useCallback(() => {
    if (listenerRef.current) {
      listenerRef.current.remove();
      listenerRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.remove();
      playerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
    return () => cleanupPlayer();
  }, [cleanupPlayer]);

  const handleStatusUpdate = useCallback((status: AudioStatus) => {
    setPosition(Math.floor(status.currentTime));
    setDuration(Math.floor(status.duration));
    setIsBuffering(status.isBuffering);
    setIsPlaying(status.playing);

    if (status.didJustFinish) {
      setIsPlaying(false);
    }
  }, []);

  const playStory = useCallback((story: Story) => {
    cleanupPlayer();
    setCurrentStory(story);
    setIsSleepMode(false);

    const source = getAudioSource(story);
    const player = createAudioPlayer(source, { updateInterval: 500 });
    playerRef.current = player;

    const subscription = player.addListener('playbackStatusUpdate', handleStatusUpdate);
    listenerRef.current = subscription;

    player.play();
    setIsPlaying(true);
  }, [cleanupPlayer, handleStatusUpdate]);

  const pause = useCallback(() => {
    playerRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    playerRef.current?.play();
    setIsPlaying(true);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds);
  }, []);

  const stopStory = useCallback(() => {
    cleanupPlayer();
    setCurrentStory(null);
    setIsPlaying(false);
    setIsBuffering(false);
    setIsSleepMode(false);
    setPosition(0);
    setDuration(0);
  }, [cleanupPlayer]);

  const toggleSleepMode = useCallback(() => {
    setIsSleepMode((prev) => !prev);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentStory,
        isPlaying,
        isBuffering,
        isSleepMode,
        position,
        duration,
        playStory,
        pause,
        resume,
        seekTo,
        stopStory,
        toggleSleepMode,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/contexts/__tests__/PlayerContext.test.tsx --no-cache`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/contexts/PlayerContext.tsx src/contexts/__tests__/PlayerContext.test.tsx
git commit -m "feat: expand PlayerContext with expo-audio integration"
```

---

### Task 5: Playback Screen

**Covers:** S4

**Files:**
- Create: `src/app/player.tsx`

- [ ] **Step 1: Implement the playback screen**

```typescript
// src/app/player.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { Image, Pressable, StyleSheet, View, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { GlassView } from 'expo-glass-effect';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePlayer } from '@/contexts/PlayerContext';
import { Colors, Spacing } from '@/constants/theme';
import { PROTAGONISTS } from '@/types';
import { formatDuration } from '@/lib/utils';
import type { Story } from '@/types';

export default function PlayerScreen() {
  const { story: storyJson } = useLocalSearchParams<{ story: string }>();
  const {
    currentStory,
    isPlaying,
    isBuffering,
    position,
    duration,
    playStory,
    pause,
    resume,
    seekTo,
    stopStory,
    toggleSleepMode,
  } = usePlayer();

  const [imageError, setImageError] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  let story: Story;
  try {
    story = JSON.parse(storyJson!);
  } catch {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>No story data</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText style={styles.backText}>Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const protagonist = PROTAGONISTS.find((p) => p.id === story.protagonist);
  const showPlaceholder = !story.cover_image_url || imageError;

  useEffect(() => {
    if (!currentStory || currentStory.id !== story.id) {
      playStory(story);
    }
    return () => {
      stopStory();
    };
  }, []);

  const resetHideTimer = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setControlsVisible(true);
    hideTimeout.current = setTimeout(() => setControlsVisible(false), 5000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [resetHideTimer]);

  const handleScreenTap = useCallback(() => {
    if (controlsVisible) {
      setControlsVisible(false);
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    } else {
      resetHideTimer();
    }
  }, [controlsVisible, resetHideTimer]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
    resetHideTimer();
  }, [isPlaying, pause, resume, resetHideTimer]);

  const handleSeek = useCallback((value: number) => {
    seekTo(value);
    resetHideTimer();
  }, [seekTo, resetHideTimer]);

  const handleBack = useCallback(() => {
    stopStory();
    router.back();
  }, [stopStory]);

  const progress = duration > 0 ? position / duration : 0;

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.backgroundPressable} onPress={handleScreenTap}>
        {/* Cover art background */}
        {!showPlaceholder ? (
          <Image
            source={{ uri: story.cover_image_url! }}
            style={styles.coverImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.placeholderBg}>
            <ThemedText style={styles.placeholderEmoji}>
              {protagonist?.emoji ?? '📖'}
            </ThemedText>
          </View>
        )}

        {/* Dimming overlay */}
        <View style={styles.dimOverlay} />

        {/* Controls */}
        {controlsVisible && (
          <View style={styles.controlsContainer}>
            {/* Top bar */}
            <View style={styles.topBar}>
              <Pressable onPress={handleBack} style={styles.backButton}>
                <ThemedText style={styles.backIcon}>‹</ThemedText>
              </Pressable>
              <Pressable onPress={toggleSleepMode} style={styles.sleepButton}>
                <ThemedText style={styles.sleepIcon}>🌙</ThemedText>
              </Pressable>
            </View>

            {/* Story info */}
            <View style={styles.storyInfo}>
              <ThemedText style={styles.protagonistLabel}>
                {protagonist?.emoji ?? '📖'} {protagonist?.name ?? 'Friend'}
              </ThemedText>
              <ThemedText style={styles.title} numberOfLines={2}>
                {story.title}
              </ThemedText>
            </View>

            {/* Center play/pause */}
            <View style={styles.centerControls}>
              <Pressable
                onPress={handlePlayPause}
                style={({ pressed }) => [
                  styles.playPauseButton,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <GlassView glassEffectStyle="regular" style={styles.playPauseGlass}>
                  <ThemedText style={styles.playPauseText}>
                    {isBuffering ? '...' : isPlaying ? '⏸' : '▶'}
                  </ThemedText>
                </GlassView>
              </Pressable>
            </View>

            {/* Bottom seek bar */}
            <View style={styles.bottomControls}>
              <ThemedText style={styles.timeText}>{formatDuration(position)}</ThemedText>
              <View style={styles.seekBarContainer}>
                <View style={styles.seekBarTrack}>
                  <View
                    style={[styles.seekBarProgress, { width: `${progress * 100}%` }]}
                  />
                </View>
                <Pressable
                  style={[styles.seekBarThumb, { left: `${progress * 100}%` }]}
                  onPress={() => {}}
                />
              </View>
              <ThemedText style={styles.timeText}>{formatDuration(duration)}</ThemedText>
            </View>
          </View>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  backgroundPressable: {
    flex: 1,
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  placeholderBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.dark.loadingBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 80,
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  backButton: {
    padding: Spacing.two,
  },
  backIcon: {
    fontSize: 32,
    color: Colors.dark.text,
  },
  sleepButton: {
    padding: Spacing.two,
  },
  sleepIcon: {
    fontSize: 24,
  },
  storyInfo: {
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.one,
  },
  protagonistLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  centerControls: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseButton: {
    borderRadius: 40,
    overflow: 'hidden',
  },
  playPauseGlass: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseText: {
    fontSize: 32,
    color: Colors.dark.text,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  timeText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    minWidth: 36,
    textAlign: 'center',
  },
  seekBarContainer: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
  },
  seekBarTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  seekBarProgress: {
    height: 3,
    backgroundColor: Colors.dark.text,
    borderRadius: 2,
  },
  seekBarThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.dark.text,
    top: 4,
    marginLeft: -6,
  },
  errorText: {
    color: Colors.dark.textSecondary,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  backText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginTop: Spacing.two,
    textAlign: 'center',
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to `player.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/app/player.tsx
git commit -m "feat: add audio playback screen with dimming overlay and controls"
```

---

### Task 6: Wire Story Card to Player

**Covers:** S4

**Files:**
- Modify: `src/app/story.tsx`

- [ ] **Step 1: Update handlePlay to navigate to /player**

In `src/app/story.tsx`, change the `handlePlay` function from calling `playStory(story)` to navigating to the player screen:

```typescript
const handlePlay = () => {
  router.push({ pathname: '/player', params: { story: storyJson } });
};
```

Remove the `usePlayer` import and the `playStory` destructure since they're no longer needed in this file:

```diff
- import { usePlayer } from '@/contexts/PlayerContext';
  ...
- const { playStory } = usePlayer();
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to `story.tsx`

- [ ] **Step 3: Update story test for navigation**

In `src/app/__tests__/story.test.tsx`, update the test that checks the Play button to verify navigation instead of `playStory`:

```typescript
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  router: { back: jest.fn(), push: mockPush },
}));
```

Update the "calls playStory when Play is tapped" test:

```typescript
it('navigates to player when Play is tapped', async () => {
  const storyJson = JSON.stringify(MOCK_STORY);
  (useLocalSearchParams as jest.Mock).mockReturnValue({
    story: storyJson,
  });
  const { getByText } = await render(<StoryScreen />);
  fireEvent.press(getByText('Play Story'));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/player',
    params: { story: storyJson },
  });
});
```

Remove the `mockPlayStory` mock and related import since `usePlayer` is no longer used in `story.tsx`.

- [ ] **Step 4: Run story tests**

Run: `npx jest src/app/__tests__/story.test.tsx --no-cache`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/story.tsx src/app/__tests__/story.test.tsx
git commit -m "feat: wire story card play button to player screen"
```

---

### Task 7: Player Screen Tests

**Covers:** S4

**Files:**
- Create: `src/app/__tests__/player.test.tsx`

- [ ] **Step 1: Write player screen tests**

```typescript
// src/app/__tests__/player.test.tsx
import { render, fireEvent } from '@testing-library/react-native';

const mockPlayStory = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockStopStory = jest.fn();
const mockToggleSleepMode = jest.fn();
const mockSeekTo = jest.fn();

jest.mock('@/contexts/PlayerContext', () => ({
  usePlayer: () => ({
    currentStory: null,
    isPlaying: false,
    isBuffering: false,
    isSleepMode: false,
    position: 0,
    duration: 120,
    playStory: mockPlayStory,
    pause: mockPause,
    resume: mockResume,
    seekTo: mockSeekTo,
    stopStory: mockStopStory,
    toggleSleepMode: mockToggleSleepMode,
  }),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  router: { back: jest.fn() },
}));

jest.mock('expo-glass-effect', () => {
  const React = require('react');
  return {
    GlassView: ({ children, ...props }: any) => React.createElement('GlassView', props, children),
  };
});

import PlayerScreen from '../player';
import { useLocalSearchParams } from 'expo-router';

const MOCK_STORY = {
  id: 'story-1',
  user_id: 'user-1',
  child_id: 'child-1',
  title: 'The Toothbrush Adventure',
  story_text: 'Once upon a time...',
  moral: 'Brushing teeth keeps your smile bright.',
  pillow_talk_prompt: 'What was your favorite part?',
  sleepy_affirmation: 'I am brave and kind.',
  cover_image_url: 'https://example.com/cover.png',
  challenge: 'refusing_teeth' as const,
  protagonist: 'barnaby' as const,
  created_at: '2026-06-20T00:00:00Z',
};

describe('PlayerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      story: JSON.stringify(MOCK_STORY),
    });
  });

  it('renders story title', async () => {
    const { getByText } = await render(<PlayerScreen />);
    expect(getByText('The Toothbrush Adventure')).toBeTruthy();
  });

  it('renders protagonist name', async () => {
    const { getByText } = await render(<PlayerScreen />);
    expect(getByText(/Barnaby/)).toBeTruthy();
  });

  it('shows error state when no story param', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    const { getByText } = await render(<PlayerScreen />);
    expect(getByText('No story data')).toBeTruthy();
  });

  it('calls playStory on mount', async () => {
    await render(<PlayerScreen />);
    expect(mockPlayStory).toHaveBeenCalledWith(MOCK_STORY);
  });
});
```

- [ ] **Step 2: Run player tests**

Run: `npx jest src/app/__tests__/player.test.tsx --no-cache`
Expected: PASS (4 tests)

- [ ] **Step 3: Run full test suite**

Run: `npx jest --no-cache`
Expected: All tests PASS

- [ ] **Step 4: Run linter**

Run: `npx expo lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/app/__tests__/player.test.tsx
git commit -m "test: add player screen tests"
```

---

### Task 8: Final Verification

**Covers:** S3, S4, S5, S6

- [ ] **Step 1: Run full test suite**

Run: `npx jest --no-cache`
Expected: All tests PASS

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Run linter**

Run: `npx expo lint`
Expected: No errors

- [ ] **Step 4: Verify all files exist**

Run: `ls -la src/app/player.tsx src/lib/audio-utils.ts src/contexts/__tests__/PlayerContext.test.tsx src/app/__tests__/player.test.tsx assets/audio/sample-story.mp3`
Expected: All files exist

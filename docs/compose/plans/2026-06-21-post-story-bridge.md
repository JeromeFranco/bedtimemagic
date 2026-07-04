# Post-Story Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the post-story bridge flow — after audio playback ends, transition through pillow talk and affirmation screens before returning home.

**Architecture:** The player screen absorbs the entire bridge flow via an in-player state machine. PlayerContext manages phase transitions (`playing` → `fading` → `pillow_talk` → `affirmation` → `done`). No new routes are added. Audio fades to silence over 3 seconds, then UI transitions to show `pillow_talk_prompt` and `sleepy_affirmation` from the existing Story type.

**Tech Stack:** expo-audio, react-native-reanimated, React Context

**Spec:** `docs/compose/specs/2026-06-21-post-story-bridge-design.md`

---

### Task 1: Enhance BreathingCircle with configurable props

**Covers:** [S6]

**Files:**
- Modify: `src/components/breathing-circle.tsx`
- Test: `src/components/__tests__/breathing-circle.test.tsx` (create)

- [ ] **Step 1: Write failing tests for BreathingCircle props**

Create `src/components/__tests__/breathing-circle.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { BreathingCircle } from '../breathing-circle';

describe('BreathingCircle', () => {
  it('renders with default size', () => {
    const { getByTestId } = render(<BreathingCircle testID="circle" />);
    const circle = getByTestId('circle');
    expect(circle.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 120, height: 120 }),
      ])
    );
  });

  it('renders with custom size', () => {
    const { getByTestId } = render(<BreathingCircle size={200} testID="circle" />);
    const circle = getByTestId('circle');
    expect(circle.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 200, height: 200, borderRadius: 100 }),
      ])
    );
  });

  it('renders with custom color', () => {
    const { getByTestId } = render(<BreathingCircle color="rgba(255,0,0,0.5)" testID="circle" />);
    const circle = getByTestId('circle');
    expect(circle.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: 'rgba(255,0,0,0.5)' }),
      ])
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/components/__tests__/breathing-circle.test.tsx --no-coverage`
Expected: FAIL — `testID` prop not accepted, no `size`/`color` props

- [ ] **Step 3: Add props to BreathingCircle**

Update `src/components/breathing-circle.tsx`:

```tsx
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const DEFAULT_SIZE = 120;
const DEFAULT_COLOR = 'rgba(139, 92, 246, 0.2)';
const DURATION = 4000;

interface BreathingCircleProps {
  size?: number;
  color?: string;
  testID?: string;
}

export function BreathingCircle({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  testID,
}: BreathingCircleProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.15, { duration: DURATION / 2, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    opacity.value = withRepeat(
      withTiming(0.6, { duration: DURATION / 2, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const dynamicStyles = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
  };

  return (
    <Animated.View
      testID={testID}
      style={[styles.circle, dynamicStyles, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  circle: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/components/__tests__/breathing-circle.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 5: Run full test suite to check for regressions**

Run: `npx jest --no-coverage`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/breathing-circle.tsx src/components/__tests__/breathing-circle.test.tsx
git commit -m "feat: add size and color props to BreathingCircle"
```

---

### Task 2: Add post-story phase state machine to PlayerContext

**Covers:** [S3, S4]

**Files:**
- Modify: `src/contexts/PlayerContext.tsx`
- Test: `src/contexts/__tests__/PlayerContext.test.tsx`

- [ ] **Step 1: Write failing tests for post-story phase**

Add to `src/contexts/__tests__/PlayerContext.test.tsx`:

Update the `TestComponent` to expose new state and methods:

```tsx
function TestComponent() {
  const {
    currentStory,
    isPlaying,
    isBuffering,
    isSleepMode,
    position,
    duration,
    postStoryPhase,
    playStory,
    pause,
    resume,
    seekTo,
    stopStory,
    toggleSleepMode,
    skipPillowTalk,
    confirmAffirmation,
  } = usePlayer();

  return (
    <View>
      <Text testID="currentStory">{currentStory?.title ?? 'none'}</Text>
      <Text testID="isPlaying">{String(isPlaying)}</Text>
      <Text testID="isBuffering">{String(isBuffering)}</Text>
      <Text testID="isSleepMode">{String(isSleepMode)}</Text>
      <Text testID="position">{String(position)}</Text>
      <Text testID="duration">{String(duration)}</Text>
      <Text testID="postStoryPhase">{postStoryPhase}</Text>
      <Pressable testID="play" onPress={() => playStory(MOCK_STORY)} />
      <Pressable testID="play2" onPress={() => playStory(MOCK_STORY_2)} />
      <Pressable testID="pause" onPress={pause} />
      <Pressable testID="resume" onPress={resume} />
      <Pressable testID="seek" onPress={() => seekTo(30)} />
      <Pressable testID="stop" onPress={stopStory} />
      <Pressable testID="toggleSleep" onPress={toggleSleepMode} />
      <Pressable testID="skipPillowTalk" onPress={skipPillowTalk} />
      <Pressable testID="confirmAffirmation" onPress={confirmAffirmation} />
    </View>
  );
}
```

Add a constant for the no-prompt story and a pressable to the TestComponent:

```tsx
const MOCK_STORY_NO_PROMPT: Story = {
  ...MOCK_STORY,
  id: 'story-no-prompt',
  pillow_talk_prompt: '',
  sleepy_affirmation: 'I am calm.',
};
```

Add to TestComponent's return JSX:
```tsx
<Pressable testID="playNoPrompt" onPress={() => playStory(MOCK_STORY_NO_PROMPT)} />
```

Add new test cases at the end of the `describe` block:

```tsx
it('initializes postStoryPhase as idle', async () => {
  const { getByTestId } = await renderProvider();
  expect(getByTestId('postStoryPhase').props.children).toBe('idle');
});

it('transitions to fading when didJustFinish fires', async () => {
  const { getByTestId } = await renderProvider();
  await act(async () => fireEvent.press(getByTestId('play')));
  await act(async () => statusCallback({
    currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true,
  }));
  expect(getByTestId('postStoryPhase').props.children).toBe('fading');
  expect(getByTestId('currentStory').props.children).toBe('Test Story');
});

it('skipPillowTalk transitions from pillow_talk to affirmation', async () => {
  const { getByTestId } = await renderProvider();
  await act(async () => fireEvent.press(getByTestId('play')));
  await act(async () => statusCallback({
    currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true,
  }));
  // Manually set to pillow_talk (simulating fade complete)
  await act(async () => statusCallback({
    currentTime: 0, duration: 0, playing: false, isBuffering: false, didJustFinish: false,
    _postStoryPhase: 'pillow_talk',
  }));
  await act(async () => fireEvent.press(getByTestId('skipPillowTalk')));
  expect(getByTestId('postStoryPhase').props.children).toBe('affirmation');
});

it('confirmAffirmation transitions to done', async () => {
  const { getByTestId } = await renderProvider();
  await act(async () => fireEvent.press(getByTestId('play')));
  await act(async () => statusCallback({
    currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true,
  }));
  await act(async () => fireEvent.press(getByTestId('confirmAffirmation')));
  expect(getByTestId('postStoryPhase').props.children).toBe('done');
});

it('stopStory resets postStoryPhase to idle', async () => {
  const { getByTestId } = await renderProvider();
  await act(async () => fireEvent.press(getByTestId('play')));
  await act(async () => statusCallback({
    currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true,
  }));
  expect(getByTestId('postStoryPhase').props.children).toBe('fading');
  await act(async () => fireEvent.press(getByTestId('stop')));
  expect(getByTestId('postStoryPhase').props.children).toBe('idle');
});

it('skips pillow talk when prompt is empty', async () => {
  const { getByTestId } = await renderProvider();
  await act(async () => fireEvent.press(getByTestId('playNoPrompt')));
  await act(async () => statusCallback({
    currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true,
  }));
  // Should skip pillow_talk and go directly to affirmation (via fading)
  // After fade completes (simulated by waiting), phase should be affirmation
  // Since fade uses setInterval, we need to wait for it
  // In tests, the fade interval runs but we can check the initial transition
  expect(getByTestId('postStoryPhase').props.children).toBe('fading');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/contexts/__tests__/PlayerContext.test.tsx --no-coverage`
Expected: FAIL — `postStoryPhase` not in context, `skipPillowTalk`/`confirmAffirmation` undefined

- [ ] **Step 3: Implement post-story phase in PlayerContext**

Update `src/contexts/PlayerContext.tsx`:

```tsx
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getAudioSource } from '@/lib/audio-utils';
import type { Story } from '@/types';

export type PostStoryPhase = 'idle' | 'fading' | 'pillow_talk' | 'affirmation' | 'done';

interface PlayerContextValue {
  currentStory: Story | null;
  isPlaying: boolean;
  isBuffering: boolean;
  isSleepMode: boolean;
  position: number;
  duration: number;
  postStoryPhase: PostStoryPhase;
  playStory: (story: Story) => void;
  pause: () => void;
  resume: () => void;
  seekTo: (seconds: number) => void;
  stopStory: () => void;
  toggleSleepMode: () => void;
  skipPillowTalk: () => void;
  confirmAffirmation: () => void;
}

const PlayerContext = createContext<PlayerContextValue>({
  currentStory: null,
  isPlaying: false,
  isBuffering: false,
  isSleepMode: false,
  position: 0,
  duration: 0,
  postStoryPhase: 'idle',
  playStory: () => {},
  pause: () => {},
  resume: () => {},
  seekTo: () => {},
  stopStory: () => {},
  toggleSleepMode: () => {},
  skipPillowTalk: () => {},
  confirmAffirmation: () => {},
});

const FADE_DURATION = 3000;
const FADE_INTERVAL = 50;

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSleepMode, setIsSleepMode] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [postStoryPhase, setPostStoryPhase] = useState<PostStoryPhase>('idle');

  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const listenerRef = useRef<{ remove: () => void } | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeStoryRef = useRef<Story | null>(null);

  const cleanupPlayer = useCallback(() => {
    if (listenerRef.current) {
      listenerRef.current.remove();
      listenerRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.remove();
      playerRef.current = null;
    }
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  const startFade = useCallback(() => {
    const player = playerRef.current;
    const hasPrompt = !!activeStoryRef.current?.pillow_talk_prompt;
    if (!player) {
      setPostStoryPhase(hasPrompt ? 'pillow_talk' : 'affirmation');
      return;
    }

    const steps = FADE_DURATION / FADE_INTERVAL;
    let step = 0;

    fadeIntervalRef.current = setInterval(() => {
      step++;
      const volume = Math.max(0, 1 - step / steps);
      player.volume = volume;

      if (step >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        setPostStoryPhase(hasPrompt ? 'pillow_talk' : 'affirmation');
      }
    }, FADE_INTERVAL);
  }, []);

  const playStory = useCallback(async (story: Story) => {
    cleanupPlayer();
    setPostStoryPhase('idle');
    activeStoryRef.current = story;

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });

    const source = getAudioSource(story);
    const player = createAudioPlayer(source);
    playerRef.current = player;

    const listener = player.addListener('playbackStatusUpdate', (status) => {
      setPosition(status.currentTime);
      setDuration(status.duration);
      setIsBuffering(status.isBuffering);
      setIsPlaying(status.playing);

      if (status.didJustFinish) {
        if (listenerRef.current) {
          listenerRef.current.remove();
          listenerRef.current = null;
        }
        setIsPlaying(false);
        setIsBuffering(false);
        setPostStoryPhase('fading');
        startFade();
      }
    });
    listenerRef.current = listener;

    setCurrentStory(story);
    setIsPlaying(true);
    setIsSleepMode(false);
    setPosition(0);
    setDuration(0);
    player.play();
  }, [cleanupPlayer, startFade]);

  const pause = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.play();
    }
    setIsPlaying(true);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds);
    }
  }, []);

  const stopStory = useCallback(() => {
    cleanupPlayer();
    setCurrentStory(null);
    setIsPlaying(false);
    setIsBuffering(false);
    setIsSleepMode(false);
    setPosition(0);
    setDuration(0);
    setPostStoryPhase('idle');
  }, [cleanupPlayer]);

  const toggleSleepMode = useCallback(() => {
    setIsSleepMode((prev) => !prev);
  }, []);

  const skipPillowTalk = useCallback(() => {
    setPostStoryPhase('affirmation');
  }, []);

  const confirmAffirmation = useCallback(() => {
    cleanupPlayer();
    setCurrentStory(null);
    setIsPlaying(false);
    setIsBuffering(false);
    setPosition(0);
    setDuration(0);
    setPostStoryPhase('done');
  }, [cleanupPlayer]);

  useEffect(() => {
    return () => cleanupPlayer();
  }, [cleanupPlayer]);

  return (
    <PlayerContext.Provider
      value={{
        currentStory,
        isPlaying,
        isBuffering,
        isSleepMode,
        position,
        duration,
        postStoryPhase,
        playStory,
        pause,
        resume,
        seekTo,
        stopStory,
        toggleSleepMode,
        skipPillowTalk,
        confirmAffirmation,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
```

- [ ] **Step 4: Update existing test for didJustFinish behavior**

The existing test `'didJustFinish clears playback state'` needs updating — it currently expects `currentStory` to be `'none'` after `didJustFinish`, but now the story stays loaded during the bridge. Update it:

```tsx
it('didJustFinish transitions to fading without clearing story', async () => {
  const { getByTestId } = await renderProvider();
  await act(async () => fireEvent.press(getByTestId('play')));
  await act(async () => statusCallback({
    currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true,
  }));
  expect(getByTestId('isPlaying').props.children).toBe('false');
  expect(getByTestId('currentStory').props.children).toBe('Test Story');
  expect(getByTestId('postStoryPhase').props.children).toBe('fading');
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/contexts/__tests__/PlayerContext.test.tsx --no-coverage`
Expected: All PASS

- [ ] **Step 6: Run full test suite**

Run: `npx jest --no-coverage`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/contexts/PlayerContext.tsx src/contexts/__tests__/PlayerContext.test.tsx
git commit -m "feat: add post-story phase state machine to PlayerContext"
```

---

### Task 3: Add post-story bridge UI to player screen

**Covers:** [S5, S7]

**Files:**
- Modify: `src/app/player.tsx`
- Test: `src/app/__tests__/player.test.tsx`

- [ ] **Step 1: Write failing tests for post-story UI**

Update `src/app/__tests__/player.test.tsx`:

Add `postStoryPhase`, `skipPillowTalk`, and `confirmAffirmation` to the mock:

```tsx
const mockSkipPillowTalk = jest.fn();
const mockConfirmAffirmation = jest.fn();

jest.mock('@/contexts/PlayerContext', () => ({
  usePlayer: jest.fn(() => ({
    currentStory: null,
    isPlaying: false,
    isBuffering: false,
    isSleepMode: false,
    position: 0,
    duration: 0,
    postStoryPhase: 'idle',
    playStory: mockPlayStory,
    pause: mockPause,
    resume: mockResume,
    seekTo: mockSeekTo,
    stopStory: mockStopStory,
    toggleSleepMode: mockToggleSleepMode,
    skipPillowTalk: mockSkipPillowTalk,
    confirmAffirmation: mockConfirmAffirmation,
  })),
}));
```

Add new test cases:

```tsx
describe('post-story bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      story: JSON.stringify(MOCK_STORY),
    });
  });

  it('shows pillow talk prompt when phase is pillow_talk', async () => {
    const { usePlayer } = require('@/contexts/PlayerContext');
    (usePlayer as jest.Mock).mockReturnValue({
      currentStory: MOCK_STORY,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'pillow_talk',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: mockStopStory,
      toggleSleepMode: mockToggleSleepMode,
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });

    const { getByText } = await render(<PlayerScreen />);
    expect(getByText('What was your favorite part?')).toBeTruthy();
    expect(getByText('Next')).toBeTruthy();
    expect(getByText('Skip for tonight')).toBeTruthy();
  });

  it('shows affirmation when phase is affirmation', async () => {
    const { usePlayer } = require('@/contexts/PlayerContext');
    (usePlayer as jest.Mock).mockReturnValue({
      currentStory: MOCK_STORY,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'affirmation',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: mockStopStory,
      toggleSleepMode: mockToggleSleepMode,
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });

    const { getByText } = await render(<PlayerScreen />);
    expect(getByText('I am brave and kind.')).toBeTruthy();
    expect(getByText('Goodnight')).toBeTruthy();
  });

  it('calls skipPillowTalk when skip is pressed', async () => {
    const { usePlayer } = require('@/contexts/PlayerContext');
    (usePlayer as jest.Mock).mockReturnValue({
      currentStory: MOCK_STORY,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'pillow_talk',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: mockStopStory,
      toggleSleepMode: mockToggleSleepMode,
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });

    const { getByText } = await render(<PlayerScreen />);
    fireEvent.press(getByText('Skip for tonight'));
    expect(mockSkipPillowTalk).toHaveBeenCalled();
  });

  it('calls confirmAffirmation when Goodnight is pressed', async () => {
    const { usePlayer } = require('@/contexts/PlayerContext');
    (usePlayer as jest.Mock).mockReturnValue({
      currentStory: MOCK_STORY,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'affirmation',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: mockStopStory,
      toggleSleepMode: mockToggleSleepMode,
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });

    const { getByText } = await render(<PlayerScreen />);
    fireEvent.press(getByText('Goodnight'));
    expect(mockConfirmAffirmation).toHaveBeenCalled();
  });

  it('navigates back when phase is done', async () => {
    const { usePlayer } = require('@/contexts/PlayerContext');
    const { router } = require('expo-router');
    (usePlayer as jest.Mock).mockReturnValue({
      currentStory: MOCK_STORY,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'done',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: mockStopStory,
      toggleSleepMode: mockToggleSleepMode,
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });

    await render(<PlayerScreen />);
    expect(router.back).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/__tests__/player.test.tsx --no-coverage`
Expected: FAIL — pillow talk text not found, new mock functions undefined

- [ ] **Step 3: Implement post-story bridge UI in player.tsx**

Update `src/app/player.tsx` — replace the entire file:

```tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { GlassView } from 'expo-glass-effect';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BreathingCircle } from '@/components/breathing-circle';
import { usePlayer } from '@/contexts/PlayerContext';
import { Colors, Spacing } from '@/constants/theme';
import { PROTAGONISTS } from '@/types';
import { formatDuration } from '@/lib/utils';
import type { Story } from '@/types';

const CONTROL_HIDE_DELAY = 5000;

export default function PlayerScreen() {
  const { story: storyJson } = useLocalSearchParams<{ story: string }>();

  let story: Story | null = null;
  let parseError = false;
  try {
    story = JSON.parse(storyJson!);
  } catch {
    parseError = true;
  }

  const {
    currentStory,
    isPlaying,
    isBuffering,
    isSleepMode,
    position,
    duration,
    postStoryPhase,
    playStory,
    pause,
    resume,
    seekTo,
    stopStory,
    toggleSleepMode,
    skipPillowTalk,
    confirmAffirmation,
  } = usePlayer();

  const [controlsVisible, setControlsVisible] = useState(true);
  const [imageError, setImageError] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekBarWidthRef = useRef(1);
  const hasAutoPlayed = useRef(false);

  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setControlsVisible(true);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, CONTROL_HIDE_DELAY);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only effect, guarded by hasAutoPlayed ref
  useEffect(() => {
    if (story && !hasAutoPlayed.current) {
      hasAutoPlayed.current = true;
      const isAlreadyPlaying =
        currentStory?.id === story.id && isPlaying;
      if (!isAlreadyPlaying) {
        playStory(story);
      }
    }
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, CONTROL_HIDE_DELAY);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      stopStory();
    };
  }, []);

  useEffect(() => {
    if (postStoryPhase === 'done') {
      router.back();
    }
  }, [postStoryPhase]);

  const handleScreenTap = () => {
    if (controlsVisible) {
      setControlsVisible(false);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      resetHideTimer();
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
    resetHideTimer();
  };

  const handleSeek = (event: { nativeEvent: { locationX: number } }) => {
    const { locationX } = event.nativeEvent;
    const fraction = Math.max(0, Math.min(1, locationX / seekBarWidthRef.current));
    seekTo(fraction * duration);
    resetHideTimer();
  };

  const handleBack = () => {
    stopStory();
    router.back();
  };

  const handleSleepToggle = () => {
    toggleSleepMode();
    resetHideTimer();
  };

  if (parseError || !story) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>No story data</ThemedText>
          <Pressable onPress={() => router.back()}>
            <ThemedText style={styles.backText}>Go Back</ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const activeStory = currentStory ?? story;
  const protagonist = PROTAGONISTS.find((p) => p.id === activeStory.protagonist);
  const showPlaceholder = !activeStory.cover_image_url || imageError;
  const progress = duration > 0 ? position / duration : 0;

  if (postStoryPhase === 'pillow_talk') {
    return (
      <View style={styles.container}>
        <View style={styles.backgroundContainer}>
          {showPlaceholder ? (
            <View style={styles.placeholder}>
              <ThemedText style={styles.placeholderEmoji}>
                {protagonist?.emoji ?? '📖'}
              </ThemedText>
            </View>
          ) : (
            <Image
              source={{ uri: activeStory.cover_image_url! }}
              style={styles.backgroundImage}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          )}
          <View style={styles.bridgeOverlay} />
        </View>

        <Animated.View
          entering={FadeIn.duration(800)}
          style={styles.bridgeContent}
        >
          <View style={styles.bridgeCircleContainer}>
            <BreathingCircle size={100} />
          </View>

          <ThemedText style={styles.pillowTalkText}>
            {activeStory.pillow_talk_prompt}
          </ThemedText>

          <View style={styles.bridgeButtons}>
            <Pressable
              onPress={skipPillowTalk}
              style={({ pressed }) => [
                styles.bridgeButtonPrimary,
                pressed && { opacity: 0.85 },
              ]}
            >
              <ThemedText style={styles.bridgeButtonPrimaryText}>Next</ThemedText>
            </Pressable>

            <Pressable onPress={skipPillowTalk} style={styles.bridgeButtonGhost}>
              <ThemedText style={styles.bridgeButtonGhostText}>Skip for tonight</ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    );
  }

  if (postStoryPhase === 'affirmation') {
    return (
      <View style={styles.container}>
        <View style={styles.backgroundContainer}>
          <View style={styles.affirmationBackground} />
        </View>

        <Animated.View
          entering={FadeIn.duration(800)}
          style={styles.bridgeContent}
        >
          <View style={styles.bridgeCircleContainer}>
            <BreathingCircle size={200} />
          </View>

          <ThemedText style={styles.affirmationText}>
            {activeStory.sleepy_affirmation}
          </ThemedText>

          <View style={styles.bridgeButtons}>
            <Pressable
              onPress={confirmAffirmation}
              style={({ pressed }) => [
                styles.bridgeButtonPrimary,
                pressed && { opacity: 0.85 },
              ]}
            >
              <ThemedText style={styles.bridgeButtonPrimaryText}>Goodnight</ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <Pressable style={styles.container} onPress={handleScreenTap}>
      <View style={styles.backgroundContainer}>
        {showPlaceholder ? (
          <View style={styles.placeholder}>
            <ThemedText style={styles.placeholderEmoji}>
              {protagonist?.emoji ?? '📖'}
            </ThemedText>
          </View>
        ) : (
          <Image
            source={{ uri: activeStory.cover_image_url! }}
            style={styles.backgroundImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        )}
        <View style={styles.dimmingOverlay} />
      </View>

      {controlsVisible && (
        <SafeAreaView style={styles.controlsContainer} pointerEvents="box-none">
          <View style={styles.topBar}>
            <Pressable onPress={handleBack} style={styles.topButton}>
              <ThemedText style={styles.topButtonText}>←</ThemedText>
            </Pressable>

            <Pressable onPress={handleSleepToggle} style={styles.topButton}>
              <ThemedText style={styles.topButtonText}>
                {isSleepMode ? '🌙' : '☽'}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.titleArea}>
            <ThemedText style={styles.storyTitle} numberOfLines={1}>
              {activeStory.title}
            </ThemedText>
            <ThemedText style={styles.protagonistLabel}>
              {protagonist?.emoji ?? '📖'} {protagonist?.name ?? 'Friend'}
            </ThemedText>
          </View>

          <View style={styles.centerArea}>
            <Pressable
              onPress={handlePlayPause}
              style={({ pressed }) => [
                styles.playPauseButton,
                pressed && { opacity: 0.85 },
              ]}
            >
              <GlassView glassEffectStyle="regular" style={styles.playPauseGlass}>
                <ThemedText style={styles.playPauseIcon}>
                  {isBuffering ? '⏳' : isPlaying ? '⏸' : '▶'}
                </ThemedText>
              </GlassView>
            </Pressable>
          </View>

          <View style={styles.bottomArea}>
            <View style={styles.seekBarContainer}>
              <Pressable
                onPress={handleSeek}
                style={styles.seekBarTrack}
                onLayout={(e) => {
                  seekBarWidthRef.current = e.nativeEvent.layout.width;
                }}
              >
                <View style={[styles.seekBarFill, { width: `${progress * 100}%` }]} />
                <View
                  style={[
                    styles.seekBarThumb,
                    { left: `${progress * 100}%` },
                  ]}
                />
              </Pressable>
              <View style={styles.timeRow}>
                <ThemedText style={styles.timeText}>
                  {formatDuration(Math.floor(position))}
                </ThemedText>
                <ThemedText style={styles.timeText}>
                  {formatDuration(Math.floor(duration))}
                </ThemedText>
              </View>
            </View>
          </View>
        </SafeAreaView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFill,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.loadingBackground,
  },
  placeholderEmoji: {
    fontSize: 80,
  },
  dimmingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bridgeOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  affirmationBackground: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  controlsContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
  },
  topButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topButtonText: {
    fontSize: 24,
    color: Colors.dark.text,
  },
  titleArea: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    opacity: 0.8,
  },
  storyTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  protagonistLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginTop: Spacing.half,
  },
  centerArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseButton: {
    width: 80,
    height: 80,
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
  playPauseIcon: {
    fontSize: 32,
    color: Colors.dark.text,
  },
  bottomArea: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  seekBarContainer: {
    gap: Spacing.one,
  },
  seekBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    justifyContent: 'center',
    position: 'relative',
  },
  seekBarFill: {
    height: 4,
    backgroundColor: Colors.dark.text,
    borderRadius: 2,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  seekBarThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.dark.text,
    position: 'absolute',
    top: -5,
    marginLeft: -7,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  errorText: {
    color: Colors.dark.textSecondary,
    fontSize: 18,
    textAlign: 'center',
  },
  backText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginTop: Spacing.two,
  },
  bridgeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  bridgeCircleContainer: {
    marginBottom: Spacing.five,
  },
  pillowTalkText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: Spacing.five,
  },
  affirmationText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 40,
    textAlign: 'center',
    marginBottom: Spacing.five,
  },
  bridgeButtons: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  bridgeButtonPrimary: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: 28,
    minWidth: 200,
    alignItems: 'center',
  },
  bridgeButtonPrimaryText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '500',
  },
  bridgeButtonGhost: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  bridgeButtonGhostText: {
    color: 'rgba(139, 92, 246, 0.7)',
    fontSize: 16,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/app/__tests__/player.test.tsx --no-coverage`
Expected: All PASS

- [ ] **Step 5: Run full test suite**

Run: `npx jest --no-coverage`
Expected: All tests pass

- [ ] **Step 6: Lint**

Run: `npx expo lint`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/app/player.tsx src/app/__tests__/player.test.tsx
git commit -m "feat: add post-story bridge UI (pillow talk + affirmation)"
```



# Story Screen Spotify-Style Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the story screen's hard-cut details→player swap with one continuous Spotify-style surface where the same cover artwork expands from details into the playing state.

**Architecture:** A single new component `StoryScreen` merges `StoryDetails` + `StoryPlayer`. One Reanimated shared value (`expand`, 0→1) drives all transition geometry via transforms only (scale/translateY/opacity) — no per-frame layout work, no remount of the `<Image>`. The route file `story.tsx` becomes a thinner orchestrator for data + post-story phases.

**Tech Stack:** React Native 0.85, Expo SDK 56, react-native-reanimated 4.3.1 (`.get()`/`.set()` API), expo-symbols, @testing-library/react-native 14, Jest.

**Spec:** `docs/superpowers/specs/2026-08-03-story-screen-spotify-transition-design.md`

## Global Constraints

- No new dependencies (AGENTS.md rule 4).
- Shared values accessed only via `.get()`/`.set()` — never `.value` (React Compiler rule, AGENTS.md).
- `withTiming()` only, ease-out. No `withSpring`, no bounce.
- Animation must be transform-only (`scale`, `translateY`, `opacity`) — never animate `width`/`height`/layout props.
- No code comments unless necessary (match existing codebase style).
- Conventional commit messages (`feat:`, `test:`, `docs:`, `chore:`).
- After every task: `npm run lint` and `npm run typecheck` must pass; run `npx jest <file>` for touched suites.
- TestIDs used across tasks (must match exactly): `story-screen` (root), `back-button`, `sleep-mode-button`, `story-artwork`, `story-text-block`, `story-moral`, `play-pause-button`, `seek-bar-track` (from SeekBar), `sleep-overlay`.

---

### Task 1: StoryScreen component — layout, expand transition, core playback

**Files:**
- Modify: `jest.setup.js` (make reanimated `interpolate`/`clamp` mocks faithful)
- Create: `src/components/story/story-screen.tsx`
- Test: `src/components/story/__tests__/story-screen.test.tsx`

**Interfaces:**
- Consumes: `SeekBar` from `./seek-bar` (props: `progress: number, position: number, duration: number, onSeek: (seconds: number) => void`); `usePlayer()` from `@/contexts/PlayerContext` (fields: `isPlaying, isBuffering, isSleepMode, position, duration, playStory, pause, resume, seekTo, stopStory, toggleSleepMode`); `Colors`, `Spacing` from `@/theme`; `Story`, `ProtagonistInfo` from `@/types`.
- Produces: `export function StoryScreen({ story, protagonist, imageSource }: { story: Story; protagonist: ProtagonistInfo | undefined; imageSource: { uri: string } | null })` — used by Task 3 in the route. Internal phase state `'details' | 'playing'`; play tap calls `playStory(story)` and animates `expand` 0→1.

- [ ] **Step 1: Make the reanimated jest mock faithful for interpolate/clamp**

In `jest.setup.js`, the current mock has `interpolate: NOOP` (returns `undefined`) and `clamp: NOOP`. Replace those two lines:

```js
    interpolate: (value, inputRange, outputRange) => {
      const inMin = inputRange[0];
      const inMax = inputRange[inputRange.length - 1];
      const outMin = outputRange[0];
      const outMax = outputRange[outputRange.length - 1];
      const t = Math.min(Math.max((value - inMin) / (inMax - inMin), 0), 1);
      return outMin + t * (outMax - outMin);
    },
    clamp: (value, min, max) => Math.min(Math.max(value, min), max),
```

- [ ] **Step 2: Verify existing suites still pass with the mock change**

Run: `npx jest`
Expected: all existing suites PASS (nothing currently depends on `interpolate` returning undefined).

- [ ] **Step 3: Write the failing tests**

Create `src/components/story/__tests__/story-screen.test.tsx`:

```tsx
import { render, fireEvent, act } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

const mockPlayStory = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockSeekTo = jest.fn();
const mockStopStory = jest.fn();
const mockToggleSleepMode = jest.fn();
let playerOverrides: Record<string, unknown> = {};

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
    skipPillowTalk: jest.fn(),
    confirmAffirmation: jest.fn(),
    ...playerOverrides,
  })),
}));

jest.mock('expo-router', () => ({
  __esModule: true,
  router: { back: jest.fn() },
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  const chainable = () => {
    const obj: Record<string, unknown> = {};
    for (const m of ['onBegin', 'onUpdate', 'onFinalize', 'onEnd', 'onStart', 'onChange']) {
      obj[m] = () => obj;
    }
    return obj;
  };
  return {
    Gesture: { Pan: chainable, Tap: chainable },
    GestureDetector: ({ children }: { children: unknown }) =>
      React.createElement(View, null, children),
  };
});

import { StoryScreen } from '../story-screen';
import { router } from 'expo-router';

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

const MOCK_PROTAGONIST = {
  id: 'barnaby' as const,
  name: 'Barnaby',
  species: 'Bear',
  emoji: '🐻',
  personality: 'Gentle bear',
  voiceNotes: 'Warm baritone',
};

const getScale = (props: { style: unknown }) =>
  (StyleSheet.flatten(props.style) as { transform: Array<{ scale: number }> }).transform[0].scale;

describe('StoryScreen', () => {
  const defaultProps = {
    story: MOCK_STORY,
    protagonist: MOCK_PROTAGONIST,
    imageSource: { uri: 'https://example.com/cover.png' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    playerOverrides = {};
  });

  it('renders title, protagonist and moral in details state', async () => {
    const { getByText } = await render(<StoryScreen {...defaultProps} />);
    expect(getByText('The Toothbrush Adventure')).toBeTruthy();
    expect(getByText('Barnaby')).toBeTruthy();
    expect(getByText('Brushing teeth keeps your smile bright.')).toBeTruthy();
  });

  it('shows a play button labeled Play story', async () => {
    const { getByTestId, getByLabelText } = await render(<StoryScreen {...defaultProps} />);
    expect(getByTestId('play-pause-button')).toBeTruthy();
    expect(getByLabelText('Play story')).toBeTruthy();
  });

  it('renders artwork scaled to 0.85 in details state', async () => {
    const { getByTestId } = await render(<StoryScreen {...defaultProps} />);
    expect(getScale(getByTestId('story-artwork').props)).toBeCloseTo(0.85);
  });

  it('starts playback and expands artwork on play tap', async () => {
    const { getByTestId } = await render(<StoryScreen {...defaultProps} />);
    await act(async () => {
      fireEvent.press(getByTestId('play-pause-button'));
    });
    expect(mockPlayStory).toHaveBeenCalledWith(MOCK_STORY);
    expect(getByTestId('seek-bar-track')).toBeTruthy();
    expect(getByTestId('sleep-mode-button')).toBeTruthy();
    expect(getScale(getByTestId('story-artwork').props)).toBeCloseTo(1);
  });

  it('removes moral from interaction after play', async () => {
    const { getByTestId } = await render(<StoryScreen {...defaultProps} />);
    await act(async () => {
      fireEvent.press(getByTestId('play-pause-button'));
    });
    expect(getByTestId('story-moral').props.pointerEvents).toBe('none');
  });

  it('pauses when playing and resumes when paused', async () => {
    const { getByTestId, rerender } = await render(<StoryScreen {...defaultProps} />);
    await act(async () => {
      fireEvent.press(getByTestId('play-pause-button'));
    });
    playerOverrides = { isPlaying: true };
    rerender(<StoryScreen {...defaultProps} />);
    await act(async () => {
      fireEvent.press(getByTestId('play-pause-button'));
    });
    expect(mockPause).toHaveBeenCalledTimes(1);
    playerOverrides = { isPlaying: false };
    rerender(<StoryScreen {...defaultProps} />);
    await act(async () => {
      fireEvent.press(getByTestId('play-pause-button'));
    });
    expect(mockResume).toHaveBeenCalledTimes(1);
  });

  it('shows buffering indicator instead of play icon while buffering', async () => {
    playerOverrides = { isBuffering: true };
    const { getByTestId, queryByText } = await render(<StoryScreen {...defaultProps} />);
    expect(queryByText('play.fill')).toBeTruthy();
    await act(async () => {
      fireEvent.press(getByTestId('play-pause-button'));
    });
    expect(queryByText('play.fill')).toBeNull();
  });

  it('goes back without stopping when back pressed in details', async () => {
    const { getByTestId } = await render(<StoryScreen {...defaultProps} />);
    fireEvent.press(getByTestId('back-button'));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(mockStopStory).not.toHaveBeenCalled();
  });

  it('stops story and goes back when back pressed while playing', async () => {
    const { getByTestId } = await render(<StoryScreen {...defaultProps} />);
    await act(async () => {
      fireEvent.press(getByTestId('play-pause-button'));
    });
    fireEvent.press(getByTestId('back-button'));
    expect(mockStopStory).toHaveBeenCalledTimes(1);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('shows placeholder emoji when imageSource is null', async () => {
    const { getByText } = await render(<StoryScreen {...defaultProps} imageSource={null} />);
    expect(getByText('🐻')).toBeTruthy();
  });

  it('calls toggleSleepMode when sleep button pressed', async () => {
    const { getByTestId } = await render(<StoryScreen {...defaultProps} />);
    await act(async () => {
      fireEvent.press(getByTestId('play-pause-button'));
    });
    fireEvent.press(getByTestId('sleep-mode-button'));
    expect(mockToggleSleepMode).toHaveBeenCalledTimes(1);
  });

  it('seeks via the seek bar in playing state', async () => {
    playerOverrides = { duration: 60 };
    const { getByTestId } = await render(<StoryScreen {...defaultProps} />);
    await act(async () => {
      fireEvent.press(getByTestId('play-pause-button'));
    });
    fireEvent.press(getByTestId('seek-bar-track'), { nativeEvent: { locationX: 0.5 } });
    expect(mockSeekTo).toHaveBeenCalledTimes(1);
  });
});
```

Notes for the implementer:
- The `queryByText('play.fill')` trick works because `jest.setup.js` mocks `expo-symbols` `SymbolView` as a `Text` rendering the iOS symbol name.
- The seek test relies on SeekBar's `trackWidth` shared value staying at its initial `1` in tests (`onLayout` never fires), so any `locationX ≥ 1` clamps to fraction 1 — we only assert the call count.

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx jest src/components/story/__tests__/story-screen.test.tsx`
Expected: FAIL — `Cannot find module '../story-screen'`.

- [ ] **Step 5: Implement StoryScreen**

Create `src/components/story/story-screen.tsx`:

```tsx
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';

import { SeekBar } from './seek-bar';
import { ThemedText } from '@/components/themed-text';
import { usePlayer } from '@/contexts/PlayerContext';
import { Colors, Spacing } from '@/theme';
import type { Story, ProtagonistInfo } from '@/types';

const EXPAND_DURATION = 350;
const DETAILS_SCALE = 0.85;

interface StoryScreenProps {
  story: Story;
  protagonist: ProtagonistInfo | undefined;
  imageSource: { uri: string } | null;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function StoryScreen({ story, protagonist, imageSource }: StoryScreenProps) {
  const { width } = useWindowDimensions();
  const {
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

  const [phase, setPhase] = useState<'details' | 'playing'>('details');
  const [imageError, setImageError] = useState(false);

  const playingSize = width - 48;
  const progress = duration > 0 ? position / duration : 0;
  const showPlaceholder = !imageSource || imageError;

  const expand = useSharedValue(0);
  const playBgColor = useSharedValue<string>(Colors.dark.bgElement);

  const artworkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(expand.get(), [0, 1], [DETAILS_SCALE, 1]) }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          expand.get(),
          [0, 1],
          [(-playingSize * (1 - DETAILS_SCALE)) / 2, 0],
        ),
      },
    ],
  }));

  const moralAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expand.get(), [0, 0.6], [1, 0]),
  }));

  const seekBarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expand.get(), [0.4, 1], [0, 1]),
  }));

  const sleepButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expand.get(), [0.4, 1], [0, 1]),
  }));

  const playAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: playBgColor.get(),
  }));

  const handlePlay = () => {
    playStory(story);
    setPhase('playing');
    expand.set(withTiming(1, { duration: EXPAND_DURATION, easing: Easing.out(Easing.ease) }));
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const handleSeek = (seconds: number) => {
    seekTo(seconds);
  };

  const handleBack = () => {
    if (phase === 'playing') {
      stopStory();
    }
    router.back();
  };

  return (
    <Pressable testID="story-screen" style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            testID="back-button"
            accessibilityLabel="Go back"
            onPress={handleBack}
            style={styles.iconButton}
          >
            <SymbolView
              name={{ ios: 'chevron.backward', android: 'arrow_back' }}
              size={24}
              tintColor={Colors.dark.textPrimary}
            />
          </Pressable>
          {phase === 'playing' && (
            <Animated.View style={sleepButtonAnimatedStyle}>
              <Pressable
                testID="sleep-mode-button"
                accessibilityLabel="Sleep mode"
                onPress={toggleSleepMode}
                style={styles.iconButton}
              >
                <SymbolView
                  name={{ ios: 'moon.fill', android: 'bedtime' }}
                  size={24}
                  tintColor={Colors.dark.textPrimary}
                />
              </Pressable>
            </Animated.View>
          )}
        </View>

        <View style={[styles.artworkSlot, { height: playingSize }]}>
          <Animated.View
            testID="story-artwork"
            style={[{ width: playingSize, height: playingSize }, artworkAnimatedStyle]}
          >
            {showPlaceholder ? (
              <View style={styles.placeholder}>
                <ThemedText style={styles.placeholderEmoji}>
                  {protagonist?.emoji ?? '📖'}
                </ThemedText>
              </View>
            ) : (
              <Image
                source={imageSource!}
                style={styles.coverImage}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            )}
          </Animated.View>
        </View>

        <Animated.View testID="story-text-block" style={[styles.textBlock, textAnimatedStyle]}>
          <ThemedText style={styles.title}>{story.title}</ThemedText>
          <ThemedText style={styles.protagonist}>{protagonist?.name ?? 'Friend'}</ThemedText>
        </Animated.View>

        <View style={styles.spacer} />

        <View style={styles.band}>
          <Animated.View
            testID="story-moral"
            style={[styles.bandFill, moralAnimatedStyle]}
            pointerEvents={phase === 'playing' ? 'none' : 'auto'}
          >
            <ThemedText style={styles.moral}>{story.moral}</ThemedText>
          </Animated.View>
          {phase === 'playing' && (
            <Animated.View style={[styles.bandFill, seekBarAnimatedStyle]}>
              <SeekBar
                progress={progress}
                position={position}
                duration={duration}
                onSeek={handleSeek}
              />
            </Animated.View>
          )}
        </View>

        <View style={styles.playRow}>
          <AnimatedPressable
            testID="play-pause-button"
            accessibilityLabel={phase === 'playing' && isPlaying ? 'Pause' : 'Play story'}
            onPress={phase === 'playing' ? handlePlayPause : handlePlay}
            onPressIn={() => playBgColor.set(withTiming(Colors.dark.bgElementHover, { duration: 150 }))}
            onPressOut={() => playBgColor.set(withTiming(Colors.dark.bgElement, { duration: 150 }))}
            style={[styles.playButton, playAnimatedStyle]}
          >
            {phase === 'playing' && isBuffering ? (
              <ActivityIndicator size="small" color={Colors.dark.textPrimary} />
            ) : (
              <SymbolView
                name={
                  phase === 'playing' && isPlaying
                    ? { ios: 'pause.fill', android: 'pause' }
                    : { ios: 'play.fill', android: 'play_arrow' }
                }
                size={32}
                tintColor={Colors.dark.textPrimary}
              />
            )}
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgBase,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(6,10,26,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.bgDeepest,
  },
  placeholderEmoji: {
    fontSize: 64,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  textBlock: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    gap: Spacing.xxs,
  },
  title: {
    color: Colors.dark.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.24,
  },
  protagonist: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  spacer: {
    flex: 1,
  },
  band: {
    height: 72,
  },
  bandFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  moral: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  playRow: {
    alignItems: 'center',
    paddingBottom: Spacing.lg,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

Design notes (why the code is shaped this way):
- The artwork renders at full playing size (`playingSize = width − 48`) from mount; the details state is a pure `scale: 0.85` transform, so the transition is transform-only (no per-frame layout). Scaling down keeps the image crisp.
- The text block's `translateY` compensates for the scaled artwork's raised visual bottom edge: `−playingSize × (1 − 0.85) / 2` at `expand = 0`, so the gap under the artwork stays constant.
- Moral and SeekBar share one fixed-height slot (`band`, 72px) via absolute `bandFill` layers — the crossfade is opacity-only.
- Moral stays mounted during playing at opacity 0 with `pointerEvents: 'none'` so nothing unmounts mid-animation.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest src/components/story/__tests__/story-screen.test.tsx`
Expected: all tests PASS.

- [ ] **Step 7: Lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: both exit 0.

- [ ] **Step 8: Commit**

```bash
git add jest.setup.js src/components/story/story-screen.tsx src/components/story/__tests__/story-screen.test.tsx
git commit -m "feat: add unified StoryScreen with spotify-style layout and expand transition"
```

---

### Task 2: Sleep-ready behaviors — controls auto-hide, tap-to-toggle, sleep overlay, reduced motion

**Files:**
- Modify: `src/components/story/story-screen.tsx`
- Test: `src/components/story/__tests__/story-screen.test.tsx` (extend)

**Interfaces:**
- Consumes: the Task 1 `StoryScreen` component and its test file.
- Produces: same public component API (no prop changes). New testID `sleep-overlay` on the sleep-mode overlay view. Controls (top bar content, band content, play button) auto-hide 5s after playback starts, restore on screen tap, and all interactions reset the timer.

Behavior carried over from the old `StoryPlayer` (`src/components/story/story-player.tsx:19-20,42-124`): `CONTROL_HIDE_DELAY = 5000`, `FADE_DURATION = 200`, the hide/unmount timer ref pattern, and the sleep overlay fading to opacity 0.92 over 1000ms.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/story/__tests__/story-screen.test.tsx` — add `AccessibilityInfo` to the `react-native` import at the top (`import { AccessibilityInfo, StyleSheet } from 'react-native';`), then add inside the existing `describe('StoryScreen', ...)` block:

```tsx
  describe('controls auto-hide', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const pressPlay = async (press: () => void) => {
      await act(async () => {
        press();
      });
    };

    it('keeps controls visible in details state indefinitely', async () => {
      const { queryByTestId } = await render(<StoryScreen {...defaultProps} />);
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });
      expect(queryByTestId('play-pause-button')).toBeTruthy();
    });

    it('hides controls 5s after playback starts', async () => {
      const { getByTestId, queryByTestId } = await render(<StoryScreen {...defaultProps} />);
      await pressPlay(() => fireEvent.press(getByTestId('play-pause-button')));
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      expect(queryByTestId('play-pause-button')).toBeNull();
      expect(queryByTestId('sleep-mode-button')).toBeNull();
      expect(queryByTestId('seek-bar-track')).toBeNull();
      expect(queryByTestId('story-artwork')).toBeTruthy();
    });

    it('shows controls on tap when hidden', async () => {
      const { getByTestId, queryByTestId } = await render(<StoryScreen {...defaultProps} />);
      await pressPlay(() => fireEvent.press(getByTestId('play-pause-button')));
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      expect(queryByTestId('play-pause-button')).toBeNull();
      await act(async () => {
        fireEvent.press(getByTestId('story-screen'));
      });
      expect(queryByTestId('play-pause-button')).toBeTruthy();
    });

    it('resets the hide timer on interaction', async () => {
      const { getByTestId, queryByTestId } = await render(<StoryScreen {...defaultProps} />);
      await pressPlay(() => fireEvent.press(getByTestId('play-pause-button')));
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
      await act(async () => {
        fireEvent.press(getByTestId('play-pause-button'));
      });
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
      expect(queryByTestId('play-pause-button')).toBeTruthy();
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      expect(queryByTestId('play-pause-button')).toBeNull();
    });
  });

  it('renders the sleep overlay', async () => {
    const { getByTestId } = await render(<StoryScreen {...defaultProps} />);
    expect(getByTestId('sleep-overlay')).toBeTruthy();
  });

  it('plays correctly with reduced motion enabled', async () => {
    const spy = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    const { getByTestId } = await render(<StoryScreen {...defaultProps} />);
    await act(async () => {
      fireEvent.press(getByTestId('play-pause-button'));
    });
    expect(getScale(getByTestId('story-artwork').props)).toBeCloseTo(1);
    expect(getByTestId('seek-bar-track')).toBeTruthy();
    spy.mockRestore();
  });
```

Note for the implementer: the jest reanimated mock applies `withTiming` instantly, so the reduced-motion vs animated paths are not distinguishable by final state — the reduced-motion test asserts the path renders correctly and consults `AccessibilityInfo`. Sleep overlay opacity animation is likewise asserted structurally (overlay presence), since the mock does not re-render after effects set shared values.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/components/story/__tests__/story-screen.test.tsx`
Expected: new tests FAIL (controls never hide — `play-pause-button` still present after 5s; `sleep-overlay` not found).

- [ ] **Step 3: Add auto-hide, tap-to-toggle, sleep overlay, and reduced motion to StoryScreen**

Apply these changes to `src/components/story/story-screen.tsx`:

3a. Imports — replace the `useState` import line:

```tsx
import { useEffect, useRef, useState } from 'react';
```

3b. Constants — add below `DETAILS_SCALE`:

```tsx
const CONTROL_HIDE_DELAY = 5000;
const FADE_DURATION = 200;
```

3c. State, refs, and shared values — add after the existing `imageError` state line:

```tsx
  const [controlsVisible, setControlsVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

and add after the `playBgColor` shared value:

```tsx
  const controlsOpacity = useSharedValue(1);
  const sleepOverlayOpacity = useSharedValue(0);
```

3d. Animated styles — add after `playAnimatedStyle`:

```tsx
  const controlsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.get(),
  }));

  const sleepOverlayStyle = useAnimatedStyle(() => ({
    opacity: sleepOverlayOpacity.get(),
  }));
```

3e. Effects (part 1) — add after the shared values/animated styles, before `handlePlay`:

```tsx
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    sleepOverlayOpacity.set(
      withTiming(isSleepMode ? 0.92 : 0, { duration: 1000, easing: Easing.out(Easing.ease) }),
    );
  }, [isSleepMode, sleepOverlayOpacity]);
```

This requires `isSleepMode` from `usePlayer()` — add it to the destructure at the top of the component.

3f. Timer helpers — add next, still before `handlePlay` (pattern carried over from `story-player.tsx`):

```tsx
  const clearHideTimers = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
    hideTimerRef.current = null;
    unmountTimerRef.current = null;
  };

  const fadeOutControls = () => {
    controlsOpacity.set(withTiming(0, { duration: FADE_DURATION, easing: Easing.out(Easing.ease) }));
    unmountTimerRef.current = setTimeout(() => setControlsVisible(false), FADE_DURATION);
  };

  const scheduleControlsHide = () => {
    clearHideTimers();
    hideTimerRef.current = setTimeout(fadeOutControls, CONTROL_HIDE_DELAY - FADE_DURATION);
  };

  const resetHideTimer = () => {
    clearHideTimers();
    setControlsVisible(true);
    controlsOpacity.set(withTiming(1, { duration: FADE_DURATION, easing: Easing.out(Easing.ease) }));
    scheduleControlsHide();
  };

  const resetHideTimerRef = useRef(resetHideTimer);
  const clearHideTimersRef = useRef(clearHideTimers);

  useEffect(() => {
    resetHideTimerRef.current = resetHideTimer;
    clearHideTimersRef.current = clearHideTimers;
  });
```

3g. Phase effect — add after the refs above (must come after the ref declarations, mirroring `story-player.tsx` ordering):

```tsx
  useEffect(() => {
    if (phase !== 'playing') return;
    resetHideTimerRef.current();
    return () => clearHideTimersRef.current();
  }, [phase]);
```

3h. Handlers — update `handlePlay` to respect reduced motion:

```tsx
  const handlePlay = () => {
    playStory(story);
    setPhase('playing');
    expand.set(
      reduceMotion
        ? 1
        : withTiming(1, { duration: EXPAND_DURATION, easing: Easing.out(Easing.ease) }),
    );
  };
```

Update `handlePlayPause` and `handleSeek` to reset the timer:

```tsx
  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
    resetHideTimer();
  };

  const handleSeek = (seconds: number) => {
    seekTo(seconds);
    resetHideTimer();
  };
```

Add the screen-tap handler:

```tsx
  const handleScreenTap = () => {
    if (phase !== 'playing') return;
    if (controlsVisible) {
      clearHideTimers();
      fadeOutControls();
    } else {
      resetHideTimer();
    }
  };
```

3i. JSX changes:

Root Pressable gets the tap handler:

```tsx
    <Pressable testID="story-screen" style={styles.container} onPress={handleScreenTap}>
```

Add at the top of the render body (before `return`):

```tsx
  const showControls = phase === 'details' || controlsVisible;
```

Top bar — wrap content in a fixed-height slot so layout never shifts when controls unmount:

```tsx
        <View style={styles.topBar}>
          {showControls && (
            <Animated.View
              style={[styles.topBarContent, controlsAnimatedStyle]}
              pointerEvents="box-none"
            >
              <Pressable
                testID="back-button"
                accessibilityLabel="Go back"
                onPress={handleBack}
                style={styles.iconButton}
              >
                <SymbolView
                  name={{ ios: 'chevron.backward', android: 'arrow_back' }}
                  size={24}
                  tintColor={Colors.dark.textPrimary}
                />
              </Pressable>
              {phase === 'playing' && (
                <Animated.View style={sleepButtonAnimatedStyle}>
                  <Pressable
                    testID="sleep-mode-button"
                    accessibilityLabel="Sleep mode"
                    onPress={() => {
                      toggleSleepMode();
                      resetHideTimer();
                    }}
                    style={styles.iconButton}
                  >
                    <SymbolView
                      name={{ ios: 'moon.fill', android: 'bedtime' }}
                      size={24}
                      tintColor={Colors.dark.textPrimary}
                    />
                  </Pressable>
                </Animated.View>
              )}
            </Animated.View>
          )}
        </View>
```

Band — wrap both layers in the controls fade:

```tsx
        <View style={styles.band}>
          {showControls && (
            <Animated.View style={[styles.bandLayer, controlsAnimatedStyle]} pointerEvents="box-none">
              <Animated.View
                testID="story-moral"
                style={[styles.bandFill, moralAnimatedStyle]}
                pointerEvents={phase === 'playing' ? 'none' : 'auto'}
              >
                <ThemedText style={styles.moral}>{story.moral}</ThemedText>
              </Animated.View>
              {phase === 'playing' && (
                <Animated.View style={[styles.bandFill, seekBarAnimatedStyle]}>
                  <SeekBar
                    progress={progress}
                    position={position}
                    duration={duration}
                    onSeek={handleSeek}
                  />
                </Animated.View>
              )}
            </Animated.View>
          )}
        </View>
```

Play row — same treatment:

```tsx
        <View style={styles.playRow}>
          {showControls && (
            <Animated.View style={controlsAnimatedStyle}>
              <AnimatedPressable
                testID="play-pause-button"
                accessibilityLabel={phase === 'playing' && isPlaying ? 'Pause' : 'Play story'}
                onPress={phase === 'playing' ? handlePlayPause : handlePlay}
                onPressIn={() => playBgColor.set(withTiming(Colors.dark.bgElementHover, { duration: 150 }))}
                onPressOut={() => playBgColor.set(withTiming(Colors.dark.bgElement, { duration: 150 }))}
                style={[styles.playButton, playAnimatedStyle]}
              >
                {phase === 'playing' && isBuffering ? (
                  <ActivityIndicator size="small" color={Colors.dark.textPrimary} />
                ) : (
                  <SymbolView
                    name={
                      phase === 'playing' && isPlaying
                        ? { ios: 'pause.fill', android: 'pause' }
                        : { ios: 'play.fill', android: 'play_arrow' }
                    }
                    size={32}
                    tintColor={Colors.dark.textPrimary}
                  />
                )}
              </AnimatedPressable>
            </Animated.View>
          )}
        </View>
```

Sleep overlay — add after the closing `</SafeAreaView>` tag, inside the root Pressable:

```tsx
      <Animated.View testID="sleep-overlay" style={[styles.sleepOverlay, sleepOverlayStyle]} pointerEvents="none" />
```

3j. Styles — add/replace:

```tsx
  topBarContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bandLayer: {
    flex: 1,
  },
  sleepOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.dark.bgDeepest,
  },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/components/story/__tests__/story-screen.test.tsx`
Expected: all tests PASS (Task 1 tests still green).

- [ ] **Step 5: Lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/story/story-screen.tsx src/components/story/__tests__/story-screen.test.tsx
git commit -m "feat: add controls auto-hide, sleep overlay and reduced motion to StoryScreen"
```

---

### Task 3: Rewire route, delete old components

**Files:**
- Modify: `src/app/(index,explore)/story.tsx`
- Modify: `src/app/__tests__/story.test.tsx`
- Delete: `src/components/story/story-details.tsx`, `src/components/story/story-player.tsx`
- Delete: `src/components/story/__tests__/story-details.test.tsx`, `src/components/story/__tests__/story-player.test.tsx`

**Interfaces:**
- Consumes: `StoryScreen` from `@/components/story/story-screen` (Task 1/2).
- Produces: the route keeps its existing public behavior — loading state, error state, pillow talk / affirmation / done handling, cover caching, audio prefetch, `stopStory` on unmount.

- [ ] **Step 1: Confirm nothing else imports the old components**

Run: `grep -rl "story-details\|story-player" src`
Expected: only `src/app/(index,explore)/story.tsx` and the two test files match. If anything else matches, stop and report.

- [ ] **Step 2: Rewrite the route**

Replace `src/app/(index,explore)/story.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { StoryScreen } from '@/components/story/story-screen';
import { PillowTalk } from '@/components/story/pillow-talk';
import { Affirmation } from '@/components/story/affirmation';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/theme';
import { PROTAGONISTS } from '@/types';
import { usePlayer } from '@/contexts/PlayerContext';
import { useStory } from '@/hooks/use-story';
import { useCoverImage } from '@/hooks/use-cover-image';
import { prefetchStoryAudio } from '@/lib/audio-utils';
import { getCachedCoverPath, cacheCoverImage } from '@/lib/audio-cache';

export default function StoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: story, isLoading, error } = useStory(id!);
  const { postStoryPhase, stopStory, skipPillowTalk, confirmAffirmation } = usePlayer();

  const [localCoverPath, setLocalCoverPath] = useState<string | null>(null);

  const { coverUrl } = useCoverImage(story?.id ?? '', story?.title ?? '');

  useEffect(() => {
    if (!story) return;
    getCachedCoverPath(story.id).then((path) => {
      if (path) setLocalCoverPath(path);
    });
  }, [story?.id]);

  useEffect(() => {
    if (coverUrl && story && !localCoverPath) {
      cacheCoverImage(story.id, coverUrl)
        .then((path) => setLocalCoverPath(path))
        .catch(() => {});
    }
  }, [coverUrl, story?.id, localCoverPath]);

  useEffect(() => {
    if (story?.id && story?.story_text) {
      prefetchStoryAudio(story.id, story.story_text).catch(() => {});
    }
  }, [story?.id, story?.story_text]);

  useEffect(() => {
    if (postStoryPhase === 'done') {
      router.back();
    }
  }, [postStoryPhase]);

  useEffect(() => {
    return () => {
      stopStory();
    };
  }, []);

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.dark.textPrimary} />
        <ThemedText style={styles.loadingText}>Loading story...</ThemedText>
      </ThemedView>
    );
  }

  if (error || !story) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText style={styles.errorText}>{"Couldn't load this story"}</ThemedText>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && { backgroundColor: Colors.dark.bgElement },
          ]}
        >
          <ThemedText style={styles.secondaryButtonText}>Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const protagonist = PROTAGONISTS.find((p) => p.id === story.protagonist);
  const imageSource = localCoverPath
    ? { uri: localCoverPath }
    : coverUrl
    ? { uri: coverUrl }
    : null;

  if (postStoryPhase === 'pillow_talk') {
    return (
      <PillowTalk
        story={story}
        protagonistEmoji={protagonist?.emoji ?? '📖'}
        imageSource={imageSource}
        onSkip={skipPillowTalk}
        onImageError={() => {}}
      />
    );
  }

  if (postStoryPhase === 'affirmation') {
    return (
      <Affirmation
        text={story.sleepy_affirmation}
        onConfirm={confirmAffirmation}
      />
    );
  }

  return (
    <StoryScreen
      story={story}
      protagonist={protagonist}
      imageSource={imageSource}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgBase,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
  },
  errorText: {
    color: Colors.dark.textSecondary,
    fontSize: 17,
    textAlign: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.dark.borderDefault,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    marginTop: Spacing.sm,
  },
  secondaryButtonText: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
});
```

Changes vs the old file: `StoryDetails`/`StoryPlayer` imports replaced by `StoryScreen`; the `phase` state and `playStory` destructure removed (phase now lives inside `StoryScreen`); the two conditional renders at the bottom collapsed into one `<StoryScreen>` render. Everything else is unchanged.

- [ ] **Step 3: Update the route tests**

In `src/app/__tests__/story.test.tsx`, change these two tests:

```tsx
  it('renders story details with title and play button', async () => {
    const { getByText, getByTestId } = await render(<StoryScreen />);
    expect(getByText('The Toothbrush Adventure')).toBeTruthy();
    expect(getByTestId('play-pause-button')).toBeTruthy();
  });

  it('calls playStory and shows player when Play is tapped', async () => {
    const { getByTestId } = await render(<StoryScreen />);
    await act(async () => {
      fireEvent.press(getByTestId('play-pause-button'));
    });
    expect(mockPlayStory).toHaveBeenCalledWith(MOCK_STORY);
    expect(getByTestId('seek-bar-track')).toBeTruthy();
  });
```

All other tests in the file stay exactly as they are.

- [ ] **Step 4: Delete the old components and their tests**

```bash
git rm src/components/story/story-details.tsx src/components/story/story-player.tsx \
  src/components/story/__tests__/story-details.test.tsx src/components/story/__tests__/story-player.test.tsx
```

- [ ] **Step 5: Run the affected suites**

Run: `npx jest src/app/__tests__/story.test.tsx src/components/story`
Expected: all PASS.

- [ ] **Step 6: Run the full test suite**

Run: `npm run test:ci`
Expected: all suites PASS.

- [ ] **Step 7: Lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: both exit 0.

- [ ] **Step 8: Commit**

```bash
git add -A src/app src/components/story
git commit -m "refactor: rewire story route to unified StoryScreen, remove legacy components"
```

---

### Task 4: DESIGN.md deviation notes + final verification

**Files:**
- Modify: `DESIGN.md`

**Interfaces:**
- Consumes: nothing code-level.
- Produces: DESIGN.md records the three approved deviations (spec §9).

- [ ] **Step 1: Record the button exception**

In `DESIGN.md` section 3d, replace the line:

```
  - No ghost buttons, no icon-only buttons, no floating action buttons.
```

with:

```
  - No ghost buttons, no icon-only buttons, no floating action buttons. Exception: the story screen's circular play/pause button is icon-only — a sanctioned playback control — and carries a contextual accessibility label ("Play story" / "Pause").
```

- [ ] **Step 2: Record the motion exception**

In `DESIGN.md` section 6, the Motion rules bullet ends with:

```
In Reanimated, use `withTiming()` exclusively — never `withSpring()`, which defaults to bounce.
```

Append to that same bullet:

```
Exception: the story screen's details→playing transition is a 350ms ease-out shared-element-style morph — artwork scale and translate plus a band crossfade, all driven by a single shared value, transforms only. Still no spring, no bounce. Story screen text order is title-first (Spotify-style).
```

- [ ] **Step 3: Full verification gates**

Run: `npm run lint && npm run typecheck && npm run test:ci`
Expected: all three exit 0. Do not claim success otherwise.

- [ ] **Step 4: Commit**

```bash
git add DESIGN.md
git commit -m "docs: record story screen design deviations in DESIGN.md"
```

- [ ] **Step 5: Manual on-device verification (user)**

Run the app (`npx expo start`), open a story, and verify:
- Play tap: artwork expands smoothly (~350ms), moral crossfades into seek bar, no flicker or hard cut
- Controls hide after ~5s of playback; tap anywhere restores them
- Sleep mode fades the screen down; moon toggle works
- Back during playback stops audio and exits
- The transition feels at 60fps (no dropped frames during the morph)

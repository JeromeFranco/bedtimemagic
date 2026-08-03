# Spotify-Style Unified Story Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `story.tsx` and `story-player.tsx` into a single, unified Spotify-style bedtime audio player with in-place playback, artwork scaling, metadata display, interactive scrubber, quick skip controls, and uniform button press feedback.

**Architecture:** Replace the two-phase screen swap (`phase === 'details'` vs `phase === 'playing'`) with a unified `StoryPlayer` component. Tapping Play initiates audio directly in-place without layout jumps. The header bar, cover artwork card, track metadata, seek bar, and control cluster are rendered in a clean single-column layout with low-stimulus dark aesthetics.

**Tech Stack:** React Native, Reanimated v3 (`.get()`/`.set()`), Expo Symbols (`SymbolView`), `@testing-library/react-native`, Jest.

## Global Constraints

- Exclusively dark mode: base `#0F1328`, surface `#171C38`, element `#1F2545`, text primary `#E2E0F0`, text secondary `#8E8AA8`.
- Press feedback: elevation step background shift (`--bg-element` -> `--bg-element-hover`) with 150ms `withTiming()` transition.
- Reanimated shared values must use `.get()` / `.set()` methods — never access `.value` directly.
- No spring or bounce animations (use `withTiming` ease-out exclusively).
- All touch targets minimum 44×44pt.

---

### Task 1: Refactor `StoryPlayer` into Spotify-Style Unified Player Component

**Files:**
- Modify: `src/components/story/story-player.tsx`
- Modify: `src/components/story/__tests__/story-player.test.tsx`

**Interfaces:**
- Consumes: `story: Story`, `protagonist: ProtagonistInfo | undefined`, `imageSource: { uri: string } | null`, `onBack: () => void`, `usePlayer()` context (`isPlaying`, `isBuffering`, `isSleepMode`, `position`, `duration`, `playStory`, `pause`, `resume`, `seekTo`, `toggleSleepMode`).
- Produces: `StoryPlayer` unified component rendering header controls with press feedback, 1:1 artwork card, title & moral metadata, interactive seek bar, -15s / +15s jump buttons, and central play/pause button.

- [ ] **Step 1: Write updated tests in `src/components/story/__tests__/story-player.test.tsx`**

```tsx
import { render, fireEvent, act } from '@testing-library/react-native';

const mockPlayStory = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockSeekTo = jest.fn();
const mockToggleSleepMode = jest.fn();

jest.mock('@/contexts/PlayerContext', () => ({
  usePlayer: jest.fn(() => ({
    currentStory: null,
    isPlaying: false,
    isBuffering: false,
    isSleepMode: false,
    position: 0,
    duration: 60,
    postStoryPhase: 'idle',
    playStory: mockPlayStory,
    pause: mockPause,
    resume: mockResume,
    seekTo: mockSeekTo,
    stopStory: jest.fn(),
    toggleSleepMode: mockToggleSleepMode,
    skipPillowTalk: jest.fn(),
    confirmAffirmation: jest.fn(),
  })),
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

import { StoryPlayer } from '../story-player';

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

describe('StoryPlayer', () => {
  const defaultProps = {
    story: MOCK_STORY,
    protagonist: MOCK_PROTAGONIST,
    imageSource: { uri: 'https://example.com/cover.png' },
    onBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders story title and moral', async () => {
    const { getByText } = await render(<StoryPlayer {...defaultProps} />);
    expect(getByText('The Toothbrush Adventure')).toBeTruthy();
    expect(getByText('Brushing teeth keeps your smile bright.')).toBeTruthy();
  });

  it('renders protagonist name', async () => {
    const { getByText } = await render(<StoryPlayer {...defaultProps} />);
    expect(getByText('Barnaby')).toBeTruthy();
  });

  it('calls playStory when Play is pressed while not playing', async () => {
    const { getByTestId } = await render(<StoryPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('play-pause-button'));
    expect(mockPlayStory).toHaveBeenCalledWith(MOCK_STORY);
  });

  it('calls pause when Play is pressed while playing', async () => {
    const { usePlayer } = require('@/contexts/PlayerContext');
    usePlayer.mockReturnValue({
      currentStory: MOCK_STORY,
      isPlaying: true,
      isBuffering: false,
      isSleepMode: false,
      position: 30,
      duration: 60,
      postStoryPhase: 'idle',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: jest.fn(),
      toggleSleepMode: mockToggleSleepMode,
    });
    const { getByTestId } = await render(<StoryPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('play-pause-button'));
    expect(mockPause).toHaveBeenCalledTimes(1);
  });

  it('calls seekTo when -15s or +15s buttons are pressed', async () => {
    const { usePlayer } = require('@/contexts/PlayerContext');
    usePlayer.mockReturnValue({
      currentStory: MOCK_STORY,
      isPlaying: true,
      isBuffering: false,
      isSleepMode: false,
      position: 30,
      duration: 60,
      postStoryPhase: 'idle',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: jest.fn(),
      toggleSleepMode: mockToggleSleepMode,
    });
    const { getByTestId } = await render(<StoryPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('seek-backward-button'));
    expect(mockSeekTo).toHaveBeenCalledWith(15);

    fireEvent.press(getByTestId('seek-forward-button'));
    expect(mockSeekTo).toHaveBeenCalledWith(45);
  });

  it('calls onBack when back button pressed', async () => {
    const { getByTestId } = await render(<StoryPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('player-back-button'));
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('calls toggleSleepMode when sleep button pressed', async () => {
    const { getByTestId } = await render(<StoryPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('sleep-mode-button'));
    expect(mockToggleSleepMode).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx jest src/components/story/__tests__/story-player.test.tsx`  
Expected: FAIL due to missing testIDs (`seek-backward-button`, `seek-forward-button`) or moral text rendering.

- [ ] **Step 3: Implement Spotify-Style `StoryPlayer` component**

Modify `src/components/story/story-player.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';

import { SeekBar } from './seek-bar';
import { ThemedText } from '@/components/themed-text';
import { usePlayer } from '@/contexts/PlayerContext';
import { Colors, Spacing } from '@/theme';
import type { Story, ProtagonistInfo } from '@/types';

interface StoryPlayerProps {
  story: Story;
  protagonist: ProtagonistInfo | undefined;
  imageSource: { uri: string } | null;
  onBack: () => void;
}

export function StoryPlayer({ story, protagonist, imageSource, onBack }: StoryPlayerProps) {
  const { width } = useWindowDimensions();
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
    toggleSleepMode,
  } = usePlayer();

  const [imageError, setImageError] = useState(false);

  const progress = duration > 0 ? position / duration : 0;
  const isCurrentStory = currentStory?.id === story.id;

  const imageScale = useSharedValue(1);
  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.get() }],
  }));

  const backBgColor = useSharedValue<string>(Colors.dark.bgElement);
  const backAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: backBgColor.get(),
  }));

  const sleepBgColor = useSharedValue<string>(Colors.dark.bgElement);
  const sleepAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: sleepBgColor.get(),
  }));

  const playBgColor = useSharedValue<string>(Colors.dark.bgElement);
  const playAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: playBgColor.get(),
  }));

  const sleepOverlayOpacity = useSharedValue(0);
  const sleepOverlayStyle = useAnimatedStyle(() => ({
    opacity: sleepOverlayOpacity.get(),
  }));

  useEffect(() => {
    if (isPlaying && isCurrentStory) {
      imageScale.set(
        withRepeat(
          withTiming(1.02, { duration: 15000, easing: Easing.inOut(Easing.ease) }),
          -1,
          true,
        ),
      );
    } else {
      imageScale.set(withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }));
    }
  }, [isPlaying, isCurrentStory, imageScale]);

  useEffect(() => {
    sleepOverlayOpacity.set(
      withTiming(isSleepMode ? 0.92 : 0, { duration: 1000, easing: Easing.out(Easing.ease) }),
    );
  }, [isSleepMode, sleepOverlayOpacity]);

  const handlePlayPause = () => {
    if (!isCurrentStory) {
      playStory(story);
    } else if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const handleSeek = (seconds: number) => {
    seekTo(seconds);
  };

  const handleSeekRelative = (delta: number) => {
    const nextPos = Math.max(0, Math.min(duration, position + delta));
    seekTo(nextPos);
  };

  const showPlaceholder = !imageSource || imageError;
  const imageSize = Math.min(width - Spacing.xl * 2, 320);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header Bar */}
      <View style={styles.topBar}>
        <AnimatedPressable
          testID="player-back-button"
          accessibilityLabel="Go back"
          onPress={onBack}
          onPressIn={() => backBgColor.set(withTiming(Colors.dark.bgElementHover, { duration: 150 }))}
          onPressOut={() => backBgColor.set(withTiming(Colors.dark.bgElement, { duration: 150 }))}
          style={[styles.headerButton, backAnimatedStyle]}
        >
          <SymbolView
            name={{ ios: 'chevron.backward', android: 'arrow_back' }}
            size={24}
            tintColor={Colors.dark.textPrimary}
          />
        </AnimatedPressable>

        <AnimatedPressable
          testID="sleep-mode-button"
          accessibilityLabel="Sleep Mode"
          onPress={toggleSleepMode}
          onPressIn={() => sleepBgColor.set(withTiming(Colors.dark.bgElementHover, { duration: 150 }))}
          onPressOut={() => sleepBgColor.set(withTiming(Colors.dark.bgElement, { duration: 150 }))}
          style={[styles.headerButton, sleepAnimatedStyle]}
        >
          <SymbolView
            name={{ ios: 'moon.fill', android: 'bedtime' }}
            size={24}
            tintColor={isSleepMode ? Colors.dark.accentPurple : Colors.dark.textPrimary}
          />
        </AnimatedPressable>
      </View>

      {/* Main Content Vertical Stack */}
      <View style={styles.content}>
        {/* Centered Artwork Card */}
        <View style={styles.artworkWrapper}>
          <Animated.View
            style={[
              styles.artworkContainer,
              { width: imageSize, height: imageSize },
              imageAnimatedStyle,
            ]}
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
                style={styles.artworkImage}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            )}
          </Animated.View>
        </View>

        {/* Track Metadata */}
        <View style={styles.metadataArea}>
          <ThemedText style={styles.storyTitle} numberOfLines={2}>
            {story.title}
          </ThemedText>
          <ThemedText style={styles.subtitleText} numberOfLines={1}>
            {protagonist?.name ? `${protagonist.name} • ` : ''}{story.moral}
          </ThemedText>
        </View>

        {/* Seek Bar */}
        <View style={styles.seekArea}>
          <SeekBar
            progress={progress}
            position={position}
            duration={duration}
            onSeek={handleSeek}
          />
        </View>

        {/* Playback Controls */}
        <View style={styles.controlsRow}>
          <Pressable
            testID="seek-backward-button"
            accessibilityLabel="Rewind 15 seconds"
            onPress={() => handleSeekRelative(-15)}
            style={styles.secondaryControlBtn}
          >
            <SymbolView
              name={{ ios: 'gobackward.15', android: 'replay_10' }}
              size={28}
              tintColor={Colors.dark.textSecondary}
            />
          </Pressable>

          <AnimatedPressable
            testID="play-pause-button"
            accessibilityLabel={isPlaying && isCurrentStory ? 'Pause' : 'Play'}
            onPress={handlePlayPause}
            onPressIn={() => playBgColor.set(withTiming(Colors.dark.bgElementHover, { duration: 150 }))}
            onPressOut={() => playBgColor.set(withTiming(Colors.dark.bgElement, { duration: 150 }))}
            style={[styles.playPauseButton, playAnimatedStyle]}
          >
            {isBuffering && isCurrentStory ? (
              <ActivityIndicator size="small" color={Colors.dark.textPrimary} />
            ) : (
              <SymbolView
                name={
                  isPlaying && isCurrentStory
                    ? { ios: 'pause.fill', android: 'pause' }
                    : { ios: 'play.fill', android: 'play_arrow' }
                }
                size={36}
                tintColor={Colors.dark.textPrimary}
              />
            )}
          </AnimatedPressable>

          <Pressable
            testID="seek-forward-button"
            accessibilityLabel="Forward 15 seconds"
            onPress={() => handleSeekRelative(15)}
            style={styles.secondaryControlBtn}
          >
            <SymbolView
              name={{ ios: 'goforward.15', android: 'forward_10' }}
              size={28}
              tintColor={Colors.dark.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      {/* Sleep Mode Overlay */}
      <Animated.View style={[styles.sleepOverlay, sleepOverlayStyle]} pointerEvents="none" />
    </SafeAreaView>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgBase,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.xs,
  },
  artworkWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  artworkContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.dark.bgSurface,
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.bgDeepest,
  },
  placeholderEmoji: {
    fontSize: 72,
  },
  metadataArea: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  storyTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.24,
  },
  subtitleText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  seekArea: {
    width: '100%',
    marginVertical: Spacing.xs,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['2xl'],
    marginTop: Spacing.xs,
  },
  secondaryControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sleepOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.dark.bgDeepest,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/story/__tests__/story-player.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/story/story-player.tsx src/components/story/__tests__/story-player.test.tsx
git commit -m "feat(player): refactor story-player into spotify-style unified player layout"
```

---

### Task 2: Simplify `story.tsx` & Remove Legacy `StoryDetails` View

**Files:**
- Modify: `src/app/(index,explore)/story.tsx`
- Modify: `src/app/__tests__/story.test.tsx`
- Delete: `src/components/story/story-details.tsx`
- Delete: `src/components/story/__tests__/story-details.test.tsx`

**Interfaces:**
- Consumes: `useStory`, `useCoverImage`, `usePlayer`, `StoryPlayer`.
- Produces: Clean single-screen story route using `StoryPlayer` without two-phase state toggling.

- [ ] **Step 1: Update tests in `src/app/__tests__/story.test.tsx`**

Modify `src/app/__tests__/story.test.tsx` to align with single-screen `StoryPlayer` rendering:

```tsx
import { render, fireEvent, act } from '@testing-library/react-native';

const mockPlayStory = jest.fn();
const mockStopStory = jest.fn();
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
    pause: jest.fn(),
    resume: jest.fn(),
    seekTo: jest.fn(),
    stopStory: mockStopStory,
    toggleSleepMode: jest.fn(),
    skipPillowTalk: mockSkipPillowTalk,
    confirmAffirmation: mockConfirmAffirmation,
  })),
}));

jest.mock('expo-router', () => ({
  __esModule: true,
  useLocalSearchParams: jest.fn(),
  router: { back: jest.fn() },
}));

jest.mock('@/hooks/use-story', () => ({
  useStory: jest.fn(),
}));

jest.mock('@/hooks/use-cover-image', () => ({
  useCoverImage: jest.fn(() => ({ coverUrl: null, isLoading: false, error: null })),
}));

jest.mock('@/lib/audio-cache', () => ({
  getCachedCoverPath: jest.fn(() => Promise.resolve(null)),
  cacheCoverImage: jest.fn(() => Promise.resolve('/cached/path')),
}));

jest.mock('@/lib/audio-utils', () => ({
  prefetchStoryAudio: jest.fn(() => Promise.resolve()),
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

import StoryScreen from '../(index,explore)/story';
import { useLocalSearchParams, router } from 'expo-router';
import { useStory } from '@/hooks/use-story';
import { useCoverImage } from '@/hooks/use-cover-image';

const { usePlayer } = require('@/contexts/PlayerContext');

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

describe('StoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'story-1' });
    (useStory as jest.Mock).mockReturnValue({ data: MOCK_STORY, isLoading: false, error: null });
    (useCoverImage as jest.Mock).mockReturnValue({ coverUrl: 'https://example.com/cover.png', isLoading: false, error: null });
  });

  it('renders spotify player layout directly with title and play button', async () => {
    const { getByText, getByTestId } = await render(<StoryScreen />);
    expect(getByText('The Toothbrush Adventure')).toBeTruthy();
    expect(getByTestId('play-pause-button')).toBeTruthy();
  });

  it('calls playStory when play button is pressed', async () => {
    const { getByTestId } = await render(<StoryScreen />);
    await act(async () => {
      fireEvent.press(getByTestId('play-pause-button'));
    });
    expect(mockPlayStory).toHaveBeenCalledWith(MOCK_STORY);
  });

  it('shows loading state', async () => {
    (useStory as jest.Mock).mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { getByText } = await render(<StoryScreen />);
    expect(getByText('Loading story...')).toBeTruthy();
  });

  it('shows error state with Go Back', async () => {
    (useStory as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, error: new Error('fail') });
    const { getByText } = await render(<StoryScreen />);
    expect(getByText("Couldn't load this story")).toBeTruthy();
    fireEvent.press(getByText('Go Back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('renders pillow talk when postStoryPhase is pillow_talk', async () => {
    usePlayer.mockReturnValue({
      currentStory: MOCK_STORY,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'pillow_talk',
      playStory: mockPlayStory,
      pause: jest.fn(),
      resume: jest.fn(),
      seekTo: jest.fn(),
      stopStory: mockStopStory,
      toggleSleepMode: jest.fn(),
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });
    const { getByText } = await render(<StoryScreen />);
    expect(getByText('What was your favorite part?')).toBeTruthy();
  });

  it('renders affirmation when postStoryPhase is affirmation', async () => {
    usePlayer.mockReturnValue({
      currentStory: MOCK_STORY,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'affirmation',
      playStory: mockPlayStory,
      pause: jest.fn(),
      resume: jest.fn(),
      seekTo: jest.fn(),
      stopStory: mockStopStory,
      toggleSleepMode: mockToggleSleepMode,
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });
    const { getByText } = await render(<StoryScreen />);
    expect(getByText('I am brave and kind.')).toBeTruthy();
  });

  it('navigates back when postStoryPhase is done', async () => {
    usePlayer.mockReturnValue({
      currentStory: null,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'done',
      playStory: mockPlayStory,
      pause: jest.fn(),
      resume: jest.fn(),
      seekTo: jest.fn(),
      stopStory: mockStopStory,
      toggleSleepMode: mockToggleSleepMode,
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });
    await render(<StoryScreen />);
    expect(router.back).toHaveBeenCalled();
  });

  it('calls stopStory on unmount', async () => {
    const { unmount } = await render(<StoryScreen />);
    await unmount();
    expect(mockStopStory).toHaveBeenCalled();
  });

  it('prefetches story audio on mount', async () => {
    const { prefetchStoryAudio } = require('@/lib/audio-utils');
    await render(<StoryScreen />);
    expect(prefetchStoryAudio).toHaveBeenCalledWith('story-1', 'Once upon a time...');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx jest src/app/__tests__/story.test.tsx`  
Expected: FAIL because `story.tsx` still renders `StoryDetails` (which looks for "Play Story" text).

- [ ] **Step 3: Refactor `src/app/(index,explore)/story.tsx`**

Modify `src/app/(index,explore)/story.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { StoryPlayer } from '@/components/story/story-player';
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

export default function StoryScreen() {
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
    <StoryPlayer
      story={story}
      protagonist={protagonist}
      imageSource={imageSource}
      onBack={() => {
        stopStory();
        router.back();
      }}
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

- [ ] **Step 4: Delete obsolete `story-details.tsx` files**

Remove `src/components/story/story-details.tsx` and `src/components/story/__tests__/story-details.test.tsx`.

- [ ] **Step 5: Run tests and typecheck**

Run: `npm run typecheck && npm test src/app/__tests__/story.test.tsx src/components/story/__tests__/story-player.test.tsx`  
Expected: PASS with 0 lint or type errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(index,explore\)/story.tsx src/app/__tests__/story.test.tsx
git rm src/components/story/story-details.tsx src/components/story/__tests__/story-details.test.tsx
git commit -m "refactor(story): simplify story screen to single-phase spotify player layout"
```

---

## Plan Verification Checklist

- Run typecheck: `npm run typecheck`
- Run lint: `npm run lint`
- Run test suite: `npm test`

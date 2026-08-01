# Story + Player Combined Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the story details screen and player screen into a single screen with internal phase management, eliminating one navigation step.

**Architecture:** `story.tsx` becomes a thin orchestrator that derives its render phase from local state + `PlayerContext.postStoryPhase`, delegating to five extracted components in `src/components/story/`. The `/player` route is deleted.

**Tech Stack:** React Native, expo-router, react-native-reanimated, react-native-gesture-handler, expo-symbols, @testing-library/react-native

## Global Constraints

- No gradients — solid backgrounds and scrims only
- No emoji in UI chrome — icons via `expo-symbols` `SymbolView`
- Two button variants only: Primary (`bg-element` fill, rounded 12) and Secondary (transparent, 1px `border-default`, rounded 12)
- Press feedback: background elevation shift only, 150ms `withTiming`
- Motion: `withTiming` only, ease-out, no spring/bounce
- Type scale: 11/13/15/17/20/24/32/40
- Touch targets: minimum 44x44pt
- Reduced motion: all ambient/entrance animations disabled via `AccessibilityInfo.isReduceMotionEnabled()`
- Immersive screens: edge-to-edge under status bar
- No comments in code
- Run `npm run lint` and `npm run typecheck` after every task

---

## File Structure

```
Create:
  src/components/story/seek-bar.tsx          — draggable seek bar + time labels
  src/components/story/story-details.tsx     — details phase (cover, title, moral, play button)
  src/components/story/story-player.tsx      — immersive player (uses usePlayer() directly)
  src/components/story/pillow-talk.tsx       — pillow talk post-story phase
  src/components/story/affirmation.tsx       — affirmation post-story phase
  src/components/story/__tests__/seek-bar.test.tsx
  src/components/story/__tests__/story-details.test.tsx
  src/components/story/__tests__/story-player.test.tsx
  src/components/story/__tests__/pillow-talk.test.tsx
  src/components/story/__tests__/affirmation.test.tsx

Modify:
  src/app/(index,explore)/story.tsx          — rewrite as orchestrator
  src/app/(index,explore)/_layout.tsx        — remove player route
  src/app/__tests__/story.test.tsx           — update for new behavior
  jest.setup.js                              — add expo-symbols mock

Delete:
  src/app/(index,explore)/player.tsx
  src/app/__tests__/player.test.tsx
```

---

### Task 1: SeekBar Component

**Files:**
- Create: `src/components/story/seek-bar.tsx`
- Create: `src/components/story/__tests__/seek-bar.test.tsx`

**Interfaces:**
- Consumes: `formatDuration` from `@/lib/utils`, `Colors`/`Spacing` from `@/theme`
- Produces: `SeekBar` component with props `{ progress: number; position: number; duration: number; onSeek: (seconds: number) => void }`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { SeekBar } from '../seek-bar';

describe('SeekBar', () => {
  const defaultProps = {
    progress: 0.5,
    position: 30,
    duration: 60,
    onSeek: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders current and total time labels', () => {
    const { getByText } = render(<SeekBar {...defaultProps} />);
    expect(getByText('0:30')).toBeTruthy();
    expect(getByText('1:00')).toBeTruthy();
  });

  it('calls onSeek with correct seconds when track is tapped', () => {
    const { getByTestId } = render(<SeekBar {...defaultProps} />);
    fireEvent(getByTestId('seek-bar-track'), 'onLayout', {
      nativeEvent: { layout: { width: 300 } },
    });
    fireEvent.press(getByTestId('seek-bar-track'), {
      nativeEvent: { locationX: 75 },
    });
    expect(defaultProps.onSeek).toHaveBeenCalledWith(15);
  });

  it('clamps seek to 0 when tapping before track start', () => {
    const { getByTestId } = render(<SeekBar {...defaultProps} />);
    fireEvent(getByTestId('seek-bar-track'), 'onLayout', {
      nativeEvent: { layout: { width: 300 } },
    });
    fireEvent.press(getByTestId('seek-bar-track'), {
      nativeEvent: { locationX: -10 },
    });
    expect(defaultProps.onSeek).toHaveBeenCalledWith(0);
  });

  it('clamps seek to duration when tapping past track end', () => {
    const { getByTestId } = render(<SeekBar {...defaultProps} />);
    fireEvent(getByTestId('seek-bar-track'), 'onLayout', {
      nativeEvent: { layout: { width: 300 } },
    });
    fireEvent.press(getByTestId('seek-bar-track'), {
      nativeEvent: { locationX: 400 },
    });
    expect(defaultProps.onSeek).toHaveBeenCalledWith(60);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/story/__tests__/seek-bar.test.tsx --no-coverage`
Expected: FAIL — cannot find module `../seek-bar`

- [ ] **Step 3: Write minimal implementation**

```tsx
import { useRef, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/theme';
import { formatDuration } from '@/lib/utils';

interface SeekBarProps {
  progress: number;
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
}

export function SeekBar({ progress, position, duration, onSeek }: SeekBarProps) {
  const trackWidthRef = useRef(1);
  const thumbScale = useSharedValue(1);

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: thumbScale.value }],
  }));

  const handleSeek = useCallback(
    (locationX: number) => {
      const fraction = Math.max(0, Math.min(1, locationX / trackWidthRef.current));
      onSeek(fraction * duration);
    },
    [duration, onSeek],
  );

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      thumbScale.set(withTiming(18 / 14, { duration: 150 }));
    })
    .onUpdate((event) => {
      handleSeek(event.x);
    })
    .onFinalize(() => {
      thumbScale.set(withTiming(1, { duration: 150 }));
    });

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Pressable
          testID="seek-bar-track"
          style={styles.track}
          onPress={(e) => handleSeek(e.nativeEvent.locationX)}
          onLayout={(e) => {
            trackWidthRef.current = e.nativeEvent.layout.width;
          }}
        >
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          <Animated.View
            style={[styles.thumb, { left: `${progress * 100}%` }, thumbAnimatedStyle]}
          />
        </Pressable>
      </GestureDetector>
      <View style={styles.timeRow}>
        <ThemedText style={styles.timeText}>{formatDuration(Math.floor(position))}</ThemedText>
        <ThemedText style={styles.timeText}>{formatDuration(Math.floor(duration))}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  track: {
    height: 44,
    justifyContent: 'center',
    position: 'relative',
  },
  fill: {
    height: 4,
    backgroundColor: Colors.dark.textPrimary,
    borderRadius: 2,
    position: 'absolute',
    top: 20,
    left: 0,
  },
  thumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.dark.textPrimary,
    position: 'absolute',
    top: 15,
    marginLeft: -7,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/story/__tests__/seek-bar.test.tsx --no-coverage`
Expected: PASS (4 tests)

- [ ] **Step 5: Lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: exit 0

- [ ] **Step 6: Commit**

```bash
git add src/components/story/seek-bar.tsx src/components/story/__tests__/seek-bar.test.tsx
git commit -m "feat: add SeekBar component with drag and tap-to-seek"
```

---

### Task 2: StoryDetails Component

**Files:**
- Create: `src/components/story/story-details.tsx`
- Create: `src/components/story/__tests__/story-details.test.tsx`
- Modify: `jest.setup.js` (add expo-symbols mock)

**Interfaces:**
- Consumes: `Colors`/`Spacing` from `@/theme`, `SymbolView` from `expo-symbols`, `Story`/`ProtagonistInfo` from `@/types`
- Produces: `StoryDetails` component with props `{ story: Story; protagonist: ProtagonistInfo | undefined; imageSource: { uri: string } | null; onBack: () => void; onPlay: () => void }`

- [ ] **Step 1: Add expo-symbols mock to jest.setup.js**

Append to `jest.setup.js`:

```js
jest.mock('expo-symbols', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    SymbolView: ({ name, ...props }) => {
      const label = typeof name === 'string' ? name : (name && name.ios) || 'symbol';
      return React.createElement(Text, props, label);
    },
  };
});
```

- [ ] **Step 2: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { StoryDetails } from '../story-details';

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

describe('StoryDetails', () => {
  const defaultProps = {
    story: MOCK_STORY,
    protagonist: MOCK_PROTAGONIST,
    imageSource: { uri: 'https://example.com/cover.png' },
    onBack: jest.fn(),
    onPlay: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders story title', () => {
    const { getByText } = render(<StoryDetails {...defaultProps} />);
    expect(getByText('The Toothbrush Adventure')).toBeTruthy();
  });

  it('renders moral', () => {
    const { getByText } = render(<StoryDetails {...defaultProps} />);
    expect(getByText('Brushing teeth keeps your smile bright.')).toBeTruthy();
  });

  it('renders protagonist name without emoji', () => {
    const { getByText } = render(<StoryDetails {...defaultProps} />);
    expect(getByText('Barnaby')).toBeTruthy();
  });

  it('renders Play Story button and calls onPlay', () => {
    const { getByText } = render(<StoryDetails {...defaultProps} />);
    fireEvent.press(getByText('Play Story'));
    expect(defaultProps.onPlay).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when back button pressed', () => {
    const { getByTestId } = render(<StoryDetails {...defaultProps} />);
    fireEvent.press(getByTestId('back-button'));
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows placeholder when imageSource is null', () => {
    const { getByText } = render(
      <StoryDetails {...defaultProps} imageSource={null} />,
    );
    expect(getByText('🐻')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/components/story/__tests__/story-details.test.tsx --no-coverage`
Expected: FAIL — cannot find module `../story-details`

- [ ] **Step 4: Write minimal implementation**

```tsx
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/theme';
import type { Story, ProtagonistInfo } from '@/types';

interface StoryDetailsProps {
  story: Story;
  protagonist: ProtagonistInfo | undefined;
  imageSource: { uri: string } | null;
  onBack: () => void;
  onPlay: () => void;
}

export function StoryDetails({ story, protagonist, imageSource, onBack, onPlay }: StoryDetailsProps) {
  const { height } = useWindowDimensions();
  const [imageError, setImageError] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(8);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      contentOpacity.set(1);
      contentTranslateY.set(0);
    } else {
      contentOpacity.set(withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) }));
      contentTranslateY.set(withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) }));
    }
  }, [reduceMotion]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const playBgColor = useSharedValue<string>(Colors.dark.bgElement);
  const playAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: playBgColor.value,
  }));

  const showPlaceholder = !imageSource || imageError;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.imageContainer, { height: height * 0.55 }]}>
        {!showPlaceholder ? (
          <Image
            source={imageSource!}
            style={styles.coverImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.placeholder}>
            <ThemedText style={styles.placeholderEmoji}>
              {protagonist?.emoji ?? '📖'}
            </ThemedText>
          </View>
        )}
        <Pressable testID="back-button" onPress={onBack} style={styles.backButton}>
          <SymbolView
            name={{ ios: 'chevron.backward', android: 'arrow_back' }}
            size={24}
            tintColor={Colors.dark.textPrimary}
          />
        </Pressable>
      </View>

      <Animated.View style={[styles.content, contentAnimatedStyle]}>
        <ThemedText style={styles.protagonist}>{protagonist?.name ?? 'Friend'}</ThemedText>
        <ThemedText style={styles.title}>{story.title}</ThemedText>
        <ThemedText style={styles.moral}>{story.moral}</ThemedText>

        <AnimatedPressable
          onPress={onPlay}
          onPressIn={() => playBgColor.set(withTiming(Colors.dark.bgElementHover, { duration: 150 }))}
          onPressOut={() => playBgColor.set(withTiming(Colors.dark.bgElement, { duration: 150 }))}
          style={[styles.playButton, playAnimatedStyle]}
        >
          <ThemedText style={styles.playButtonText}>Play Story</ThemedText>
        </AnimatedPressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgBase,
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
  },
  coverImage: {
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
    fontSize: 64,
  },
  backButton: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(6,10,26,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.sm,
  },
  protagonist: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  title: {
    color: Colors.dark.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.24,
  },
  moral: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  playButton: {
    borderRadius: 12,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  playButtonText: {
    color: Colors.dark.textPrimary,
    fontWeight: '500',
    fontSize: 17,
  },
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/components/story/__tests__/story-details.test.tsx --no-coverage`
Expected: PASS (6 tests)

- [ ] **Step 6: Lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: exit 0

- [ ] **Step 7: Commit**

```bash
git add src/components/story/story-details.tsx src/components/story/__tests__/story-details.test.tsx jest.setup.js
git commit -m "feat: add StoryDetails component with entrance animation"
```

---

### Task 3: PillowTalk Component

**Files:**
- Create: `src/components/story/pillow-talk.tsx`
- Create: `src/components/story/__tests__/pillow-talk.test.tsx`

**Interfaces:**
- Consumes: `BreathingCircle` from `@/components/breathing-circle`, `Colors`/`Spacing` from `@/theme`, `Story` from `@/types`
- Produces: `PillowTalk` component with props `{ story: Story; protagonistEmoji: string; showPlaceholder: boolean; onSkip: () => void; onImageError: () => void }`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent, act } from '@testing-library/react-native';
import { PillowTalk } from '../pillow-talk';

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

describe('PillowTalk', () => {
  const defaultProps = {
    story: MOCK_STORY,
    protagonistEmoji: '🐻',
    showPlaceholder: false,
    onSkip: jest.fn(),
    onImageError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => jest.useRealTimers());

  it('renders pillow talk prompt text', () => {
    const { getByText } = render(<PillowTalk {...defaultProps} />);
    expect(getByText('What was your favorite part?')).toBeTruthy();
  });

  it('renders Next and Skip buttons', () => {
    const { getByText } = render(<PillowTalk {...defaultProps} />);
    expect(getByText('Next')).toBeTruthy();
    expect(getByText('Skip for tonight')).toBeTruthy();
  });

  it('calls onSkip when Next is pressed', () => {
    const { getByText } = render(<PillowTalk {...defaultProps} />);
    fireEvent.press(getByText('Next'));
    expect(defaultProps.onSkip).toHaveBeenCalledTimes(1);
  });

  it('calls onSkip when Skip for tonight is pressed', () => {
    const { getByText } = render(<PillowTalk {...defaultProps} />);
    fireEvent.press(getByText('Skip for tonight'));
    expect(defaultProps.onSkip).toHaveBeenCalledTimes(1);
  });

  it('hides buttons after 15s and shows on tap', () => {
    const { getByText, queryByText } = render(<PillowTalk {...defaultProps} />);
    expect(getByText('Next')).toBeTruthy();

    act(() => { jest.advanceTimersByTime(15000); });
    expect(queryByText('Next')).toBeNull();

    fireEvent.press(getByText('What was your favorite part?'));
    expect(getByText('Next')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/story/__tests__/pillow-talk.test.tsx --no-coverage`
Expected: FAIL — cannot find module `../pillow-talk`

- [ ] **Step 3: Write minimal implementation**

```tsx
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

import { BreathingCircle } from '@/components/breathing-circle';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/theme';
import type { Story } from '@/types';

const HIDE_DELAY = 15000;

interface PillowTalkProps {
  story: Story;
  protagonistEmoji: string;
  showPlaceholder: boolean;
  onSkip: () => void;
  onImageError: () => void;
}

export function PillowTalk({ story, protagonistEmoji, showPlaceholder, onSkip, onImageError }: PillowTalkProps) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const overlayOpacity = useSharedValue(0.9);
  const overlayAnimatedStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

  const screenBrightness = useSharedValue(0.3);
  const screenBrightnessStyle = useAnimatedStyle(() => ({ opacity: screenBrightness.value }));

  useEffect(() => {
    overlayOpacity.set(withTiming(0.7, { duration: 1000, easing: Easing.out(Easing.ease) }));
    screenBrightness.set(withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }));
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), HIDE_DELAY);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const handleTap = () => {
    if (controlsVisible) {
      setControlsVisible(false);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      setControlsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), HIDE_DELAY);
    }
  };

  return (
    <Pressable style={styles.container} onPress={handleTap}>
      <Animated.View style={[styles.backgroundContainer, screenBrightnessStyle]}>
        {showPlaceholder ? (
          <View style={styles.placeholder}>
            <ThemedText style={styles.placeholderEmoji}>{protagonistEmoji}</ThemedText>
          </View>
        ) : (
          <Image
            source={{ uri: story.cover_image_url! }}
            style={styles.backgroundImage}
            resizeMode="cover"
            onError={onImageError}
          />
        )}
        <Animated.View style={[styles.dimmingOverlay, overlayAnimatedStyle]} />
      </Animated.View>

      <SafeAreaView style={styles.contentContainer} pointerEvents="box-none">
        <Animated.View style={styles.centerContent} entering={FadeIn.duration(800)}>
          <View style={styles.breathingBehind}>
            <BreathingCircle size={120} testID="breathing-circle" />
          </View>
          <ThemedText style={styles.promptText}>{story.pillow_talk_prompt}</ThemedText>
        </Animated.View>

        {controlsVisible && (
          <Animated.View style={styles.buttons} entering={FadeIn.duration(400)} exiting={FadeOut.duration(400)}>
            <Pressable
              onPress={onSkip}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: pressed ? Colors.dark.bgElementHover : Colors.dark.bgElement },
              ]}
            >
              <ThemedText style={styles.primaryButtonText}>Next</ThemedText>
            </Pressable>
            <Pressable
              onPress={onSkip}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && { backgroundColor: Colors.dark.bgElement },
              ]}
            >
              <ThemedText style={styles.secondaryButtonText}>Skip for tonight</ThemedText>
            </Pressable>
          </Animated.View>
        )}
      </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgBase,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
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
    fontSize: 80,
  },
  dimmingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,10,26,0.8)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingHorizontal: Spacing['2xl'],
    position: 'relative',
  },
  breathingBehind: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptText: {
    color: Colors.dark.textPrimary,
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 36,
    textAlign: 'center',
  },
  buttons: {
    width: '100%',
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.dark.bgElement,
    paddingVertical: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.dark.textPrimary,
    fontSize: 17,
    fontWeight: '500',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.dark.borderDefault,
    paddingVertical: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.dark.textSecondary,
    fontSize: 17,
    fontWeight: '500',
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/story/__tests__/pillow-talk.test.tsx --no-coverage`
Expected: PASS (5 tests)

- [ ] **Step 5: Lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: exit 0

- [ ] **Step 6: Commit**

```bash
git add src/components/story/pillow-talk.tsx src/components/story/__tests__/pillow-talk.test.tsx
git commit -m "feat: add PillowTalk component with design-system buttons"
```

---

### Task 4: Affirmation Component

**Files:**
- Create: `src/components/story/affirmation.tsx`
- Create: `src/components/story/__tests__/affirmation.test.tsx`

**Interfaces:**
- Consumes: `BreathingCircle` from `@/components/breathing-circle`, `Colors`/`Spacing` from `@/theme`
- Produces: `Affirmation` component with props `{ text: string; onConfirm: () => void }`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { Affirmation } from '../affirmation';

describe('Affirmation', () => {
  const defaultProps = {
    text: 'I am brave and kind.',
    onConfirm: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders affirmation text', () => {
    const { getByText } = render(<Affirmation {...defaultProps} />);
    expect(getByText('I am brave and kind.')).toBeTruthy();
  });

  it('renders Goodnight button', () => {
    const { getByText } = render(<Affirmation {...defaultProps} />);
    expect(getByText('Goodnight')).toBeTruthy();
  });

  it('calls onConfirm when Goodnight is pressed', () => {
    const { getByText } = render(<Affirmation {...defaultProps} />);
    fireEvent.press(getByText('Goodnight'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders breathing circle', () => {
    const { getByTestId } = render(<Affirmation {...defaultProps} />);
    expect(getByTestId('breathing-circle')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/story/__tests__/affirmation.test.tsx --no-coverage`
Expected: FAIL — cannot find module `../affirmation`

- [ ] **Step 3: Write minimal implementation**

```tsx
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BreathingCircle } from '@/components/breathing-circle';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/theme';

interface AffirmationProps {
  text: string;
  onConfirm: () => void;
}

export function Affirmation({ text, onConfirm }: AffirmationProps) {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
        <Animated.View style={styles.centerContent} entering={FadeIn.duration(800)}>
          <BreathingCircle size={200} testID="breathing-circle" />
          <ThemedText style={styles.affirmationText}>{text}</ThemedText>
        </Animated.View>

        <View style={styles.buttonContainer}>
          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: pressed ? Colors.dark.bgElementHover : Colors.dark.bgElement },
            ]}
          >
            <ThemedText style={styles.primaryButtonText}>Goodnight</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgDeepest,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingHorizontal: Spacing['2xl'],
  },
  affirmationText: {
    color: Colors.dark.textPrimary,
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 36,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.lg,
  },
  primaryButton: {
    backgroundColor: Colors.dark.bgElement,
    paddingVertical: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.dark.textPrimary,
    fontSize: 17,
    fontWeight: '500',
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/story/__tests__/affirmation.test.tsx --no-coverage`
Expected: PASS (4 tests)

- [ ] **Step 5: Lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: exit 0

- [ ] **Step 6: Commit**

```bash
git add src/components/story/affirmation.tsx src/components/story/__tests__/affirmation.test.tsx
git commit -m "feat: add Affirmation component"
```

---

### Task 5: StoryPlayer Component

**Files:**
- Create: `src/components/story/story-player.tsx`
- Create: `src/components/story/__tests__/story-player.test.tsx`

**Interfaces:**
- Consumes: `usePlayer` from `@/contexts/PlayerContext`, `SeekBar` from `./seek-bar`, `SymbolView` from `expo-symbols`, `Colors`/`Spacing` from `@/theme`, `Story`/`ProtagonistInfo` from `@/types`
- Produces: `StoryPlayer` component with props `{ story: Story; protagonist: ProtagonistInfo | undefined; imageSource: { uri: string } | null; onBack: () => void }`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent, act } from '@testing-library/react-native';

const mockPause = jest.fn();
const mockResume = jest.fn();
const mockSeekTo = jest.fn();
const mockToggleSleepMode = jest.fn();

jest.mock('@/contexts/PlayerContext', () => ({
  usePlayer: jest.fn(() => ({
    currentStory: null,
    isPlaying: true,
    isBuffering: false,
    isSleepMode: false,
    position: 30,
    duration: 60,
    postStoryPhase: 'idle',
    playStory: jest.fn(),
    pause: mockPause,
    resume: mockResume,
    seekTo: mockSeekTo,
    stopStory: jest.fn(),
    toggleSleepMode: mockToggleSleepMode,
    skipPillowTalk: jest.fn(),
    confirmAffirmation: jest.fn(),
  })),
}));

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
    jest.useFakeTimers();
  });

  afterEach(() => jest.useRealTimers());

  it('renders story title at 40px hero size', () => {
    const { getByText } = render(<StoryPlayer {...defaultProps} />);
    expect(getByText('The Toothbrush Adventure')).toBeTruthy();
  });

  it('renders protagonist name', () => {
    const { getByText } = render(<StoryPlayer {...defaultProps} />);
    expect(getByText('Barnaby')).toBeTruthy();
  });

  it('calls pause when playing and play/pause pressed', () => {
    const { getByTestId } = render(<StoryPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('play-pause-button'));
    expect(mockPause).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when back button pressed', () => {
    const { getByTestId } = render(<StoryPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('player-back-button'));
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('calls toggleSleepMode when sleep button pressed', () => {
    const { getByTestId } = render(<StoryPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('sleep-mode-button'));
    expect(mockToggleSleepMode).toHaveBeenCalledTimes(1);
  });

  it('hides controls after 5s', () => {
    const { queryByTestId } = render(<StoryPlayer {...defaultProps} />);
    expect(queryByTestId('play-pause-button')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(5000); });
    expect(queryByTestId('play-pause-button')).toBeNull();
  });

  it('shows controls on tap when hidden', () => {
    const { getByTestId, queryByTestId } = render(<StoryPlayer {...defaultProps} />);
    act(() => { jest.advanceTimersByTime(5000); });
    expect(queryByTestId('play-pause-button')).toBeNull();
    fireEvent.press(getByTestId('player-screen'));
    expect(queryByTestId('play-pause-button')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/story/__tests__/story-player.test.tsx --no-coverage`
Expected: FAIL — cannot find module `../story-player`

- [ ] **Step 3: Write minimal implementation**

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
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

const CONTROL_HIDE_DELAY = 5000;

interface StoryPlayerProps {
  story: Story;
  protagonist: ProtagonistInfo | undefined;
  imageSource: { uri: string } | null;
  onBack: () => void;
}

export function StoryPlayer({ story, protagonist, imageSource, onBack }: StoryPlayerProps) {
  const {
    isPlaying,
    isBuffering,
    isSleepMode,
    position,
    duration,
    pause,
    resume,
    seekTo,
    toggleSleepMode,
  } = usePlayer();

  const [controlsVisible, setControlsVisible] = useState(true);
  const [imageError, setImageError] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = duration > 0 ? position / duration : 0;

  const imageScale = useSharedValue(1);
  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.value }],
  }));

  const controlsOpacity = useSharedValue(1);
  const controlsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const sleepOverlayOpacity = useSharedValue(0);
  const sleepOverlayStyle = useAnimatedStyle(() => ({
    opacity: sleepOverlayOpacity.value,
  }));

  useEffect(() => {
    imageScale.set(
      withRepeat(
        withTiming(1.03, { duration: 30000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, []);

  useEffect(() => {
    sleepOverlayOpacity.set(
      withTiming(isSleepMode ? 0.92 : 0, { duration: 1000, easing: Easing.out(Easing.ease) }),
    );
  }, [isSleepMode]);

  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setControlsVisible(true);
    controlsOpacity.set(withTiming(1, { duration: 200 }));
    hideTimerRef.current = setTimeout(() => {
      controlsOpacity.set(withTiming(0, { duration: 200 }));
      setTimeout(() => setControlsVisible(false), 200);
    }, CONTROL_HIDE_DELAY);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const handleScreenTap = () => {
    if (controlsVisible) {
      controlsOpacity.set(withTiming(0, { duration: 200 }));
      setTimeout(() => setControlsVisible(false), 200);
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

  const handleSeek = (seconds: number) => {
    seekTo(seconds);
    resetHideTimer();
  };

  const showPlaceholder = !imageSource || imageError;

  return (
    <Pressable testID="player-screen" style={styles.container} onPress={handleScreenTap}>
      <Animated.View style={[styles.backgroundContainer, imageAnimatedStyle]}>
        {showPlaceholder ? (
          <View style={styles.placeholder}>
            <ThemedText style={styles.placeholderEmoji}>
              {protagonist?.emoji ?? '📖'}
            </ThemedText>
          </View>
        ) : (
          <Image
            source={imageSource!}
            style={styles.backgroundImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        )}
      </Animated.View>
      <View style={styles.scrim} />
      <Animated.View style={[styles.sleepOverlay, sleepOverlayStyle]} pointerEvents="none" />

      {controlsVisible && (
        <Animated.View style={[styles.controls, controlsAnimatedStyle]} pointerEvents="box-none">
          <SafeAreaView style={styles.controlsInner} pointerEvents="box-none">
            <View style={styles.topBar}>
              <Pressable testID="player-back-button" onPress={onBack} style={styles.iconButton}>
                <SymbolView
                  name={{ ios: 'chevron.backward', android: 'arrow_back' }}
                  size={24}
                  tintColor={Colors.dark.textPrimary}
                />
              </Pressable>
              <Pressable testID="sleep-mode-button" onPress={() => { toggleSleepMode(); resetHideTimer(); }} style={styles.iconButton}>
                <SymbolView
                  name={{ ios: 'moon.fill', android: 'bedtime' }}
                  size={24}
                  tintColor={Colors.dark.textPrimary}
                />
              </Pressable>
            </View>

            <View style={styles.titleArea}>
              <ThemedText style={styles.storyTitle} numberOfLines={2}>
                {story.title}
              </ThemedText>
              <ThemedText style={styles.protagonistLabel}>
                {protagonist?.name ?? 'Friend'}
              </ThemedText>
            </View>

            <View style={styles.centerArea}>
              <Pressable
                testID="play-pause-button"
                onPress={handlePlayPause}
                style={({ pressed }) => [
                  styles.playPauseButton,
                  { backgroundColor: pressed ? Colors.dark.bgElementHover : Colors.dark.bgElement },
                ]}
              >
                {isBuffering ? (
                  <ActivityIndicator size="small" color={Colors.dark.textPrimary} />
                ) : (
                  <SymbolView
                    name={isPlaying
                      ? { ios: 'pause.fill', android: 'pause' }
                      : { ios: 'play.fill', android: 'play_arrow' }
                    }
                    size={32}
                    tintColor={Colors.dark.textPrimary}
                  />
                )}
              </Pressable>
            </View>

            <View style={styles.bottomArea}>
              <SeekBar
                progress={progress}
                position={position}
                duration={duration}
                onSeek={handleSeek}
              />
            </View>
          </SafeAreaView>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgBase,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
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
    fontSize: 80,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,10,26,0.55)',
  },
  sleepOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.dark.bgDeepest,
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(6,10,26,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleArea: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  storyTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 40,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  protagonistLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    marginTop: Spacing.xxs,
  },
  centerArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomArea: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/story/__tests__/story-player.test.tsx --no-coverage`
Expected: PASS (7 tests)

- [ ] **Step 5: Lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: exit 0

- [ ] **Step 6: Commit**

```bash
git add src/components/story/story-player.tsx src/components/story/__tests__/story-player.test.tsx
git commit -m "feat: add StoryPlayer component with immersive UI and sleep mode"
```

---

### Task 6: Story Screen Orchestrator

**Files:**
- Modify: `src/app/(index,explore)/story.tsx` (full rewrite)
- Modify: `src/app/__tests__/story.test.tsx` (full rewrite)

**Interfaces:**
- Consumes: `StoryDetails`, `StoryPlayer`, `PillowTalk`, `Affirmation` from `@/components/story/*`, `usePlayer` from `@/contexts/PlayerContext`, `useStory` from `@/hooks/use-story`, `useCoverImage` from `@/hooks/use-cover-image`, `prefetchStoryAudio` from `@/lib/audio-utils`, `getCachedCoverPath`/`cacheCoverImage` from `@/lib/audio-cache`
- Produces: default export `StoryScreen` (expo-router screen)

- [ ] **Step 1: Write the failing test**

Replace `src/app/__tests__/story.test.tsx` entirely:

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

  it('renders story details with title and play button', async () => {
    const { getByText } = await render(<StoryScreen />);
    expect(getByText('The Toothbrush Adventure')).toBeTruthy();
    expect(getByText('Play Story')).toBeTruthy();
  });

  it('calls playStory and shows player when Play is tapped', async () => {
    const { getByText, getByTestId } = await render(<StoryScreen />);
    fireEvent.press(getByText('Play Story'));
    expect(mockPlayStory).toHaveBeenCalledWith(MOCK_STORY);
    expect(getByTestId('play-pause-button')).toBeTruthy();
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
      toggleSleepMode: jest.fn(),
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
      toggleSleepMode: jest.fn(),
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });
    await render(<StoryScreen />);
    expect(router.back).toHaveBeenCalled();
  });

  it('calls stopStory on unmount', async () => {
    const { unmount } = await render(<StoryScreen />);
    unmount();
    expect(mockStopStory).toHaveBeenCalled();
  });

  it('prefetches story audio on mount', async () => {
    const { prefetchStoryAudio } = require('@/lib/audio-utils');
    await render(<StoryScreen />);
    expect(prefetchStoryAudio).toHaveBeenCalledWith('story-1', 'Once upon a time...');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/app/__tests__/story.test.tsx --no-coverage`
Expected: FAIL — old story.tsx doesn't render player components

- [ ] **Step 3: Rewrite story.tsx as orchestrator**

Replace `src/app/(index,explore)/story.tsx` entirely:

```tsx
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { StoryDetails } from '@/components/story/story-details';
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
  const { postStoryPhase, playStory, stopStory, skipPillowTalk, confirmAffirmation } = usePlayer();

  const [phase, setPhase] = useState<'details' | 'playing'>('details');
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
        <ThemedText style={styles.errorText}>Couldn't load this story</ThemedText>
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
  const showPlaceholder = !imageSource;

  if (postStoryPhase === 'pillow_talk') {
    return (
      <PillowTalk
        story={story}
        protagonistEmoji={protagonist?.emoji ?? '📖'}
        showPlaceholder={showPlaceholder}
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

  if (phase === 'playing') {
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

  return (
    <StoryDetails
      story={story}
      protagonist={protagonist}
      imageSource={imageSource}
      onBack={() => router.back()}
      onPlay={() => {
        playStory(story);
        setPhase('playing');
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/app/__tests__/story.test.tsx --no-coverage`
Expected: PASS (8 tests)

- [ ] **Step 5: Lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: exit 0

- [ ] **Step 6: Commit**

```bash
git add src/app/\(index,explore\)/story.tsx src/app/__tests__/story.test.tsx
git commit -m "feat: rewrite story screen as phase orchestrator with inline player"
```

---

### Task 7: Cleanup — Delete Player Route

**Files:**
- Delete: `src/app/(index,explore)/player.tsx`
- Delete: `src/app/__tests__/player.test.tsx`
- Modify: `src/app/(index,explore)/_layout.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: clean route structure with no `/player` route

- [ ] **Step 1: Delete player files**

```bash
rm src/app/\(index,explore\)/player.tsx
rm src/app/__tests__/player.test.tsx
```

- [ ] **Step 2: Remove player route from layout**

In `src/app/(index,explore)/_layout.tsx`, remove the line:
```tsx
<Stack.Screen name="player" />
```

The file becomes:

```tsx
import Stack from "expo-router/stack";

export const unstable_settings = {
  index: { anchor: "index" },
  explore: { anchor: "explore" },
};

export default function Layout({ segment }: { segment: string }) {
  const activeTab = segment.match(/\((.*)\)/)?.[1]!;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name={activeTab} />
      <Stack.Screen name="generate" />
      <Stack.Screen name="story" />
    </Stack>
  );
}
```

- [ ] **Step 3: Run full test suite**

Run: `npx jest --no-coverage`
Expected: ALL PASS, no references to deleted player module

- [ ] **Step 4: Lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove /player route, playback now lives in story screen"
```

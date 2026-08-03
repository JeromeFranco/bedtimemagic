import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  cancelAnimation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { SeekBar } from './seek-bar';
import { PillowTalkContent, AffirmationContent, GestureHintCue } from './wind-down';
import { ThemedText } from '@/components/themed-text';
import { usePlayer, type PostStoryPhase } from '@/contexts/PlayerContext';
import { Colors, CATEGORY_COLORS, Spacing } from '@/theme';
import type { Story, ProtagonistInfo } from '@/types';

const HIDE_DELAY = 5000;

interface StoryPlayerProps {
  story: Story;
  protagonist: ProtagonistInfo | undefined;
  imageSource: { uri: string } | null;
  onBack: () => void;
  postStoryPhase?: PostStoryPhase;
}

export function StoryPlayer({
  story,
  protagonist,
  imageSource,
  onBack,
  postStoryPhase: propsPostStoryPhase,
}: StoryPlayerProps) {
  const { width, height } = useWindowDimensions();
  const {
    currentStory,
    isPlaying,
    isBuffering,
    isSleepMode,
    position,
    duration,
    postStoryPhase: playerPostStoryPhase,
    playStory,
    pause,
    resume,
    seekTo,
    toggleSleepMode,
    skipPillowTalk,
    startFadeToBlack,
  } = usePlayer();

  const phase = propsPostStoryPhase ?? playerPostStoryPhase;
  const isWindDown = phase === 'pillow_talk' || phase === 'affirmation' || phase === 'fade_to_black';

  const [imageError, setImageError] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = duration > 0 ? position / duration : 0;
  const isCurrentStory = currentStory?.id === story.id;

  const imageScale = useSharedValue(1);
  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.get() }],
  }));

  const artworkDimension = useSharedValue(320);

  useEffect(() => {
    const targetDimension = isWindDown
      ? 160
      : Math.min(width - Spacing.xl * 2, (height || 600) * 0.35, 320);
    artworkDimension.set(
      withTiming(targetDimension, { duration: 1000, easing: Easing.out(Easing.ease) }),
    );
    return () => {
      cancelAnimation(artworkDimension);
    };
  }, [isWindDown, width, height, artworkDimension]);

  const artworkAnimatedContainerStyle = useAnimatedStyle(() => ({
    width: artworkDimension.get(),
    height: artworkDimension.get(),
  }));

  const dimOpacity = useSharedValue(0);

  useEffect(() => {
    const dimTarget =
      phase === 'pillow_talk'
        ? 0.6
        : phase === 'affirmation'
        ? 0.85
        : phase === 'fade_to_black'
        ? 1.0
        : 0;
    const dimDuration = phase === 'fade_to_black' ? 4000 : 2000;
    dimOpacity.set(
      withTiming(dimTarget, { duration: dimDuration, easing: Easing.out(Easing.ease) }),
    );
    return () => {
      cancelAnimation(dimOpacity);
    };
  }, [phase, dimOpacity]);

  const dimOverlayStyle = useAnimatedStyle(() => ({
    opacity: dimOpacity.get(),
  }));

  const swipeHintOpacity = useSharedValue(1);

  useEffect(() => {
    if (isWindDown && (phase === 'pillow_talk' || phase === 'affirmation')) {
      swipeHintOpacity.set(1);
      swipeHintOpacity.set(
        withDelay(
          3000,
          withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) }),
        ),
      );
    } else {
      swipeHintOpacity.set(0);
    }
    return () => {
      cancelAnimation(swipeHintOpacity);
    };
  }, [isWindDown, phase, swipeHintOpacity]);

  const swipeHintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: swipeHintOpacity.get(),
  }));

  useEffect(() => {
    if (isWindDown) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, HIDE_DELAY);
    } else {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isWindDown, phase]);

  const handleWindDownTap = () => {
    if (!isWindDown) return;
    setControlsVisible((prev) => {
      if (prev) {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        return false;
      } else {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
          setControlsVisible(false);
        }, HIDE_DELAY);
        return true;
      }
    });
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-50, 50])
    .activeOffsetY([-50, 50])
    .onEnd((event) => {
      'worklet';
      if (phase === 'pillow_talk') {
        if (event.translationX < -50 || event.translationY < -50) {
          runOnJS(skipPillowTalk)();
        }
      } else if (phase === 'affirmation') {
        if (event.translationY < -50) {
          runOnJS(startFadeToBlack)();
        }
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    'worklet';
    runOnJS(handleWindDownTap)();
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

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

  const rewindBgColor = useSharedValue<string>('transparent');
  const rewindAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: rewindBgColor.get(),
  }));

  const forwardBgColor = useSharedValue<string>('transparent');
  const forwardAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: forwardBgColor.get(),
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
    return () => {
      cancelAnimation(imageScale);
    };
  }, [isPlaying, isCurrentStory, imageScale]);

  useEffect(() => {
    sleepOverlayOpacity.set(
      withTiming(isSleepMode ? 0.92 : 0, { duration: 1000, easing: Easing.out(Easing.ease) }),
    );
    return () => {
      cancelAnimation(sleepOverlayOpacity);
    };
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header Bar */}
      <View style={styles.topBar}>
        <Pressable
          testID="player-back-button"
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={onBack}
          onPressIn={() => backBgColor.set(withTiming(Colors.dark.bgElementHover, { duration: 150 }))}
          onPressOut={() => backBgColor.set(withTiming(Colors.dark.bgElement, { duration: 150 }))}
        >
          <Animated.View style={[styles.headerButton, backAnimatedStyle]}>
            <SymbolView
              name={{ ios: 'chevron.backward', android: 'arrow_back' }}
              size={24}
              tintColor={Colors.dark.textPrimary}
            />
          </Animated.View>
        </Pressable>

        <Pressable
          testID="sleep-mode-button"
          accessibilityLabel="Sleep Mode"
          accessibilityRole="button"
          onPress={toggleSleepMode}
          onPressIn={() => sleepBgColor.set(withTiming(Colors.dark.bgElementHover, { duration: 150 }))}
          onPressOut={() => sleepBgColor.set(withTiming(Colors.dark.bgElement, { duration: 150 }))}
        >
          <Animated.View style={[styles.headerButton, sleepAnimatedStyle]}>
            <SymbolView
              name={{ ios: 'moon.fill', android: 'bedtime' }}
              size={24}
              tintColor={isSleepMode ? CATEGORY_COLORS.bedtime.primary : Colors.dark.textPrimary}
            />
          </Animated.View>
        </Pressable>
      </View>

      {/* Main Content Vertical Stack wrapped in GestureDetector */}
      <GestureDetector gesture={composedGesture}>
        <View style={styles.content}>
          {/* Centered Artwork Card */}
          <View style={styles.artworkWrapper}>
            <Animated.View
              style={[
                styles.artworkContainer,
                artworkAnimatedContainerStyle,
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
                  testID="artwork-image"
                  source={imageSource!}
                  style={styles.artworkImage}
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
              )}
            </Animated.View>
          </View>

          {!isWindDown ? (
            <>
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
                  accessibilityRole="button"
                  onPress={() => handleSeekRelative(-15)}
                  onPressIn={() => rewindBgColor.set(withTiming(Colors.dark.bgElementHover, { duration: 150 }))}
                  onPressOut={() => rewindBgColor.set(withTiming('transparent', { duration: 150 }))}
                >
                  <Animated.View style={[styles.secondaryControlBtn, rewindAnimatedStyle]}>
                    <SymbolView
                      name={{ ios: 'gobackward.15', android: 'replay_10' }}
                      size={28}
                      tintColor={Colors.dark.textSecondary}
                    />
                  </Animated.View>
                </Pressable>

                <Pressable
                  testID="play-pause-button"
                  accessibilityLabel={isPlaying && isCurrentStory ? 'Pause' : 'Play'}
                  accessibilityRole="button"
                  onPress={handlePlayPause}
                  onPressIn={() => playBgColor.set(withTiming(Colors.dark.bgElementHover, { duration: 150 }))}
                  onPressOut={() => playBgColor.set(withTiming(Colors.dark.bgElement, { duration: 150 }))}
                >
                  <Animated.View style={[styles.playPauseButton, playAnimatedStyle]}>
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
                  </Animated.View>
                </Pressable>

                <Pressable
                  testID="seek-forward-button"
                  accessibilityLabel="Forward 15 seconds"
                  accessibilityRole="button"
                  onPress={() => handleSeekRelative(15)}
                  onPressIn={() => forwardBgColor.set(withTiming(Colors.dark.bgElementHover, { duration: 150 }))}
                  onPressOut={() => forwardBgColor.set(withTiming('transparent', { duration: 150 }))}
                >
                  <Animated.View style={[styles.secondaryControlBtn, forwardAnimatedStyle]}>
                    <SymbolView
                      name={{ ios: 'goforward.15', android: 'forward_10' }}
                      size={28}
                      tintColor={Colors.dark.textSecondary}
                    />
                  </Animated.View>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.windDownArea}>
              {phase === 'pillow_talk' && (
                <>
                  <PillowTalkContent prompt={story.pillow_talk_prompt ?? ''} />
                  <GestureHintCue phase="pillow_talk" hintStyle={swipeHintAnimatedStyle} />
                  {controlsVisible && (
                    <View style={styles.windDownButtons}>
                      <Pressable
                        onPress={skipPillowTalk}
                        style={({ pressed }) => [
                          styles.primaryPillButton,
                          { backgroundColor: pressed ? Colors.dark.bgElementHover : Colors.dark.bgElement },
                        ]}
                      >
                        <ThemedText style={styles.primaryPillButtonText}>Next</ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={startFadeToBlack}
                        style={({ pressed }) => [
                          styles.secondaryPillButton,
                          pressed && { backgroundColor: Colors.dark.bgElement },
                        ]}
                      >
                        <ThemedText style={styles.secondaryPillButtonText}>Skip for tonight</ThemedText>
                      </Pressable>
                    </View>
                  )}
                </>
              )}

              {phase === 'affirmation' && (
                <>
                  <AffirmationContent text={story.sleepy_affirmation ?? ''} />
                  <GestureHintCue phase="affirmation" hintStyle={swipeHintAnimatedStyle} />
                  {controlsVisible && (
                    <View style={styles.windDownButtons}>
                      <Pressable
                        onPress={startFadeToBlack}
                        style={({ pressed }) => [
                          styles.primaryPillButton,
                          { backgroundColor: pressed ? Colors.dark.bgElementHover : Colors.dark.bgElement },
                        ]}
                      >
                        <ThemedText style={styles.primaryPillButtonText}>Goodnight</ThemedText>
                      </Pressable>
                    </View>
                  )}
                </>
              )}

              {phase === 'fade_to_black' && <View style={styles.blankWindDown} />}
            </View>
          )}
        </View>
      </GestureDetector>

      {/* Dimming Curtain Overlay */}
      <Animated.View style={[styles.dimOverlay, dimOverlayStyle]} pointerEvents="none" />

      {/* Sleep Mode Overlay */}
      <Animated.View style={[styles.sleepOverlay, sleepOverlayStyle]} pointerEvents="none" />
    </SafeAreaView>
  );
}

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
  windDownArea: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  blankWindDown: {
    flex: 1,
  },
  windDownButtons: {
    width: '100%',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  primaryPillButton: {
    backgroundColor: Colors.dark.bgElement,
    paddingVertical: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryPillButtonText: {
    color: Colors.dark.textPrimary,
    fontSize: 17,
    fontWeight: '500',
  },
  secondaryPillButton: {
    borderWidth: 1,
    borderColor: Colors.dark.borderDefault,
    paddingVertical: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryPillButtonText: {
    color: Colors.dark.textSecondary,
    fontSize: 17,
    fontWeight: '500',
  },
  dimOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.dark.bgDeepest,
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

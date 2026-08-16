import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { SeekBar } from './seek-bar';
import { AffirmationContent, PillowTalkContent } from './wind-down';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { usePlayer } from '@/contexts/PlayerContext';
import { BorderRadius, CATEGORY_COLORS, Colors, MaxContentWidth, Spacing } from '@/theme';
import type { ProtagonistInfo, Story } from '@/types';

interface StoryPlayerProps {
  story: Story;
  protagonist: ProtagonistInfo | undefined;
  imageSource: { uri: string } | null;
  onBack: () => void;
}

export function StoryPlayer({ story, protagonist, imageSource, onBack }: StoryPlayerProps) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const {
    currentStory,
    isPlaying,
    isBuffering,
    isSleepMode,
    position,
    duration,
    postStoryPhase: phase,
    playStory,
    pause,
    resume,
    seekTo,
    toggleSleepMode,
    showAffirmation,
    finishWindDown,
    completeWindDown,
  } = usePlayer();
  const [imageError, setImageError] = useState(false);
  const announcedPhaseRef = useRef<string | null>(null);
  const isPostStory = phase !== 'idle';
  const isTerminal = phase === 'fade_to_black' || phase === 'done';
  const showsArtwork = phase !== 'affirmation' && !isTerminal;
  const progress = duration > 0 ? position / duration : 0;
  const isCurrentStory = currentStory?.id === story.id;
  const showPlaceholder = !imageSource || imageError;
  const imageScale = useSharedValue(1);
  const artworkDimension = useSharedValue(320);
  const dimOpacity = useSharedValue(0);
  const sleepOverlayOpacity = useSharedValue(0);
  const terminalOpacity = useSharedValue(0);

  useEffect(() => {
    const targetDimension = isPostStory
      ? 160
      : Math.min(width - Spacing.xl * 2, (height || 600) * 0.35, 320);
    if (reducedMotion) {
      artworkDimension.set(targetDimension);
    } else {
      artworkDimension.set(
        withTiming(targetDimension, { duration: 1000, easing: Easing.out(Easing.ease) }),
      );
    }
    return () => cancelAnimation(artworkDimension);
  }, [artworkDimension, height, isPostStory, reducedMotion, width]);

  useEffect(() => {
    const targetOpacity =
      phase === 'affirmation' ? 0.85 : phase === 'fading' || phase === 'pillow_talk' ? 0.6 : 0;
    dimOpacity.set(
      withTiming(targetOpacity, { duration: 1000, easing: Easing.out(Easing.ease) }),
    );
    return () => cancelAnimation(dimOpacity);
  }, [dimOpacity, phase]);

  useEffect(() => {
    const targetOpacity = isSleepMode && phase === 'idle' ? 0.92 : 0;
    sleepOverlayOpacity.set(
      withTiming(targetOpacity, { duration: 1000, easing: Easing.out(Easing.ease) }),
    );
    return () => cancelAnimation(sleepOverlayOpacity);
  }, [isSleepMode, phase, sleepOverlayOpacity]);

  useEffect(() => {
    if (reducedMotion) {
      imageScale.set(1);
    } else if (isPlaying && isCurrentStory) {
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
    return () => cancelAnimation(imageScale);
  }, [imageScale, isCurrentStory, isPlaying, reducedMotion]);

  useEffect(() => {
    if (phase === 'fade_to_black') {
      terminalOpacity.set(
        withTiming(1, { duration: 1000, easing: Easing.out(Easing.ease) }, (finished) => {
          if (finished) runOnJS(completeWindDown)();
        }),
      );
    } else if (phase === 'done') {
      terminalOpacity.set(1);
    } else {
      terminalOpacity.set(0);
    }
    return () => cancelAnimation(terminalOpacity);
  }, [completeWindDown, phase, terminalOpacity]);

  useEffect(() => {
    if (phase !== 'pillow_talk' && phase !== 'affirmation') {
      announcedPhaseRef.current = null;
      return;
    }
    if (phase === 'pillow_talk' && announcedPhaseRef.current !== phase) {
      announcedPhaseRef.current = phase;
      AccessibilityInfo.announceForAccessibility(`Pillow talk. ${story.pillow_talk_prompt}`);
    } else if (announcedPhaseRef.current !== phase) {
      announcedPhaseRef.current = phase;
      AccessibilityInfo.announceForAccessibility(`Say together. ${story.sleepy_affirmation}`);
    }
  }, [phase, story.pillow_talk_prompt, story.sleepy_affirmation]);

  const handlePlayPause = () => {
    if (!isCurrentStory) {
      void playStory(story);
    } else if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const handleBack = () => {
    if (phase === 'idle') {
      onBack();
    } else if (!isTerminal) {
      finishWindDown();
    }
  };

  const artworkAnimatedStyle = useAnimatedStyle(() => ({
    width: artworkDimension.get(),
    height: artworkDimension.get(),
    transform: [{ scale: imageScale.get() }],
  }));
  const dimOverlayStyle = useAnimatedStyle(() => ({ opacity: dimOpacity.get() }));
  const sleepOverlayStyle = useAnimatedStyle(() => ({ opacity: sleepOverlayOpacity.get() }));
  const terminalCurtainStyle = useAnimatedStyle(() => ({ opacity: terminalOpacity.get() }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backgroundDim, dimOverlayStyle]} pointerEvents="none" />
      <Animated.View style={[styles.sleepOverlay, sleepOverlayStyle]} pointerEvents="none" />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <IconButton testID="player-back-button" accessibilityLabel="Go back" onPress={handleBack}>
            <SymbolView
              name={{ ios: 'chevron.backward', android: 'arrow_back' }}
              size={24}
              tintColor={Colors.dark.textPrimary}
            />
          </IconButton>
          {!isPostStory && (
            <IconButton
              testID="sleep-mode-button"
              accessibilityLabel="Sleep Mode"
              onPress={toggleSleepMode}
            >
              <SymbolView
                name={{ ios: 'moon.fill', android: 'bedtime' }}
                size={24}
                tintColor={isSleepMode ? CATEGORY_COLORS.bedtime.primary : Colors.dark.textPrimary}
              />
            </IconButton>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.contentColumn}>
            {showsArtwork && (
              <View style={styles.artworkWrapper}>
                <Animated.View
                  style={[styles.artworkContainer, artworkAnimatedStyle]}
                  exiting={reducedMotion ? undefined : FadeOut.duration(400)}
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
                      source={imageSource}
                      style={styles.artworkImage}
                      resizeMode="cover"
                      onError={() => setImageError(true)}
                    />
                  )}
                </Animated.View>
              </View>
            )}

            {phase === 'idle' && (
              <>
                <View style={styles.metadataArea}>
                  <ThemedText type="title" style={styles.storyTitle} numberOfLines={2}>
                    {story.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.subtitleText} numberOfLines={1}>
                    {protagonist?.name ? `${protagonist.name} • ` : ''}{story.moral}
                  </ThemedText>
                </View>
                <View style={styles.seekArea}>
                  <SeekBar
                    progress={progress}
                    position={position}
                    duration={duration}
                    onSeek={seekTo}
                  />
                </View>
                <View style={styles.controlsRow}>
                  <IconButton
                    variant="bare"
                    testID="seek-backward-button"
                    accessibilityLabel="Rewind 15 seconds"
                    onPress={() => seekTo(Math.max(0, Math.min(duration, position - 15)))}
                  >
                    <SymbolView
                      name={{ ios: 'gobackward.15', android: 'replay_10' }}
                      size={28}
                      tintColor={Colors.dark.textSecondary}
                    />
                  </IconButton>
                  <IconButton
                    testID="play-pause-button"
                    size={72}
                    accessibilityLabel={isPlaying && isCurrentStory ? 'Pause' : 'Play'}
                    onPress={handlePlayPause}
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
                  </IconButton>
                  <IconButton
                    variant="bare"
                    testID="seek-forward-button"
                    accessibilityLabel="Forward 15 seconds"
                    onPress={() => seekTo(Math.max(0, Math.min(duration, position + 15)))}
                  >
                    <SymbolView
                      name={{ ios: 'goforward.15', android: 'forward_10' }}
                      size={28}
                      tintColor={Colors.dark.textSecondary}
                    />
                  </IconButton>
                </View>
              </>
            )}

            {phase === 'pillow_talk' && (
              <Animated.View
                entering={reducedMotion ? undefined : FadeIn.duration(400)}
                exiting={reducedMotion ? undefined : FadeOut.duration(400)}
                style={styles.windDownArea}
              >
                <PillowTalkContent prompt={story.pillow_talk_prompt} />
                <View style={styles.windDownButtons}>
                  <Button label="Show affirmation" fullWidth onPress={showAffirmation} />
                  <Button label="Skip wind-down" variant="ghost" fullWidth onPress={finishWindDown} />
                </View>
              </Animated.View>
            )}

            {phase === 'affirmation' && (
              <Animated.View
                entering={reducedMotion ? undefined : FadeIn.duration(400)}
                exiting={reducedMotion ? undefined : FadeOut.duration(400)}
                style={styles.windDownArea}
              >
                <AffirmationContent text={story.sleepy_affirmation} />
                <View style={styles.windDownButtons}>
                  <Button label="Goodnight" fullWidth onPress={finishWindDown} />
                </View>
              </Animated.View>
            )}
          </View>
        </View>
      </SafeAreaView>
      {isTerminal && (
        <Animated.View
          testID="terminal-curtain"
          style={[styles.terminalCurtain, terminalCurtainStyle]}
          pointerEvents="auto"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.bgBase,
  },
  container: {
    flex: 1,
  },
  backgroundDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.dark.bgDeepest,
  },
  sleepOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.dark.bgDeepest,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.xs,
  },
  contentColumn: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  artworkWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  artworkContainer: {
    borderRadius: BorderRadius.lg,
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
    textAlign: 'center',
  },
  subtitleText: {
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
  windDownArea: {
    flex: 1,
    width: '100%',
  },
  windDownButtons: {
    width: '100%',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  terminalCurtain: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.dark.bgDeepest,
  },
});

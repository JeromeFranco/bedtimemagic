import { useState, useEffect, useRef, useCallback } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { BreathingCircle } from '@/components/breathing-circle';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePlayer } from '@/contexts/PlayerContext';
import { Colors, Spacing } from '@/constants/theme';
import { PROTAGONISTS } from '@/types';
import { useStory } from '@/hooks/use-story';
import { formatDuration } from '@/lib/utils';
import type { Story } from '@/types';

const CONTROL_HIDE_DELAY = 5000;

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: story, isLoading, error } = useStory(id!);

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

  const progress = duration > 0 ? position / duration : 0;

  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setControlsVisible(true);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, CONTROL_HIDE_DELAY);
  }, []);

  // Auto-play once when story loads
  useEffect(() => {
    if (story && !hasAutoPlayed.current) {
      hasAutoPlayed.current = true;
      const isAlreadyPlaying =
        currentStory?.id === story.id && isPlaying;
      if (!isAlreadyPlaying) {
        playStory(story);
      }
    }
  }, [story]); // eslint-disable-line react-hooks/exhaustive-deps -- ref guard prevents re-runs

  // Hide timer + unmount cleanup
  useEffect(() => {
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, CONTROL_HIDE_DELAY);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      stopStory();
    };
  }, []);

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

  useEffect(() => {
    if (postStoryPhase === 'done') {
      router.back();
    }
  }, [postStoryPhase]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color={Colors.dark.textPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !story) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Could not load story</ThemedText>
          <Pressable onPress={() => router.back()}>
            <ThemedText style={styles.backText}>Go Back</ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const protagonist = PROTAGONISTS.find((p) => p.id === story.protagonist);
  const showPlaceholder = !story.cover_image_url || imageError;

  if (postStoryPhase === 'pillow_talk') {
    return (
      <PillowTalkBridge
        story={story}
        protagonistEmoji={protagonist?.emoji ?? '📖'}
        showPlaceholder={showPlaceholder}
        onSkip={skipPillowTalk}
        onScreenTap={handleScreenTap}
        onImageError={() => setImageError(true)}
      />
    );
  }

  if (postStoryPhase === 'affirmation') {
    return (
      <View style={styles.container}>
        <View style={styles.affirmationBackground} />

        <SafeAreaView style={styles.bridgeContainer} pointerEvents="box-none">
          <Animated.View
            style={styles.bridgeContent}
            entering={FadeIn.duration(800)}
          >
            <BreathingCircle size={200} testID="breathing-circle" />
            <ThemedText style={styles.affirmationText}>
              {story.sleepy_affirmation}
            </ThemedText>
          </Animated.View>

          <View style={styles.bridgeButtons}>
            <Pressable
              onPress={confirmAffirmation}
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
            source={{ uri: story.cover_image_url! }}
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
              {story.title}
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
                { backgroundColor: pressed ? Colors.dark.bgElementHover : Colors.dark.bgElement },
              ]}
            >
              <ThemedText style={styles.playPauseIcon}>
                {isBuffering ? '⏳' : isPlaying ? '⏸' : '▶'}
              </ThemedText>
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
    backgroundColor: Colors.dark.bgBase,
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
    backgroundColor: Colors.dark.bgDeepest,
  },
  placeholderEmoji: {
    fontSize: 80,
  },
  dimmingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    color: Colors.dark.textPrimary,
  },
  titleArea: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    opacity: 0.8,
  },
  storyTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 20,
    fontWeight: '700',
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
    color: Colors.dark.textPrimary,
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
    backgroundColor: Colors.dark.textPrimary,
    borderRadius: 2,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  seekBarThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.dark.textPrimary,
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
    backgroundColor: Colors.dark.bgBase,
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
  bridgeDimmingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  affirmationBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F1328',
  },
  breathingCircleBehind: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  bridgeContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bridgeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.five,
  },
  pillowTalkText: {
    color: Colors.dark.textPrimary,
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 36,
    textAlign: 'center',
  },
  affirmationText: {
    color: Colors.dark.textPrimary,
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 40,
    textAlign: 'center',
  },
  bridgeButtons: {
    width: '100%',
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.dark.bgElement,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.seven,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.dark.textPrimary,
    fontSize: 18,
    fontWeight: '500',
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: 28,
    width: '100%',
    alignItems: 'center',
  },
  ghostButtonText: {
    color: 'rgba(139, 92, 246, 0.7)',
    fontSize: 18,
    fontWeight: '500',
  },
});

const BRIDGE_HIDE_DELAY = 15000;

function PillowTalkBridge({
  story,
  protagonistEmoji,
  showPlaceholder,
  onSkip,
  onScreenTap,
  onImageError,
}: {
  story: Story;
  protagonistEmoji: string;
  showPlaceholder: boolean;
  onSkip: () => void;
  onScreenTap: () => void;
  onImageError: () => void;
}) {
  const [bridgeControlsVisible, setBridgeControlsVisible] = useState(true);
  const bridgeHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const overlayOpacity = useSharedValue(0.9);
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const screenBrightness = useSharedValue(0.3);
  const screenBrightnessStyle = useAnimatedStyle(() => ({
    opacity: screenBrightness.value,
  }));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- reanimated shared value
    overlayOpacity.value = withTiming(0.7, { duration: 1000, easing: Easing.out(Easing.ease) });
    // eslint-disable-next-line react-hooks/immutability -- reanimated shared value
    screenBrightness.value = withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) });
    bridgeHideTimerRef.current = setTimeout(() => {
      setBridgeControlsVisible(false);
    }, BRIDGE_HIDE_DELAY);
    return () => {
      if (bridgeHideTimerRef.current) clearTimeout(bridgeHideTimerRef.current);
    };
  }, []);

  const handleBridgeTap = () => {
    onScreenTap();
    if (bridgeControlsVisible) {
      setBridgeControlsVisible(false);
      if (bridgeHideTimerRef.current) clearTimeout(bridgeHideTimerRef.current);
    } else {
      setBridgeControlsVisible(true);
      if (bridgeHideTimerRef.current) clearTimeout(bridgeHideTimerRef.current);
      bridgeHideTimerRef.current = setTimeout(() => {
        setBridgeControlsVisible(false);
      }, BRIDGE_HIDE_DELAY);
    }
  };

  return (
    <Pressable style={styles.container} onPress={handleBridgeTap}>
      <Animated.View style={[styles.backgroundContainer, screenBrightnessStyle]}>
        {showPlaceholder ? (
          <View style={styles.placeholder}>
            <ThemedText style={styles.placeholderEmoji}>
              {protagonistEmoji}
            </ThemedText>
          </View>
        ) : (
          <Image
            source={{ uri: story.cover_image_url! }}
            style={styles.backgroundImage}
            resizeMode="cover"
            onError={onImageError}
          />
        )}
        <Animated.View
          style={[styles.bridgeDimmingOverlay, overlayAnimatedStyle]}
        />
      </Animated.View>

      <SafeAreaView style={styles.bridgeContainer} pointerEvents="box-none">
        <Animated.View
          style={[styles.bridgeContent, { position: 'relative' }]}
          entering={FadeIn.duration(800)}
        >
          <View style={styles.breathingCircleBehind}>
            <BreathingCircle size={120} testID="breathing-circle" />
          </View>
          <ThemedText style={styles.pillowTalkText}>
            {story.pillow_talk_prompt}
          </ThemedText>
        </Animated.View>

        {bridgeControlsVisible && (
          <Animated.View
            style={styles.bridgeButtons}
            entering={FadeIn.duration(400)}
            exiting={FadeOut.duration(400)}
          >
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
                styles.ghostButton,
                pressed && { backgroundColor: Colors.dark.bgElementHover },
              ]}
            >
              <ThemedText style={styles.ghostButtonText}>Skip for tonight</ThemedText>
            </Pressable>
          </Animated.View>
        )}
      </SafeAreaView>
    </Pressable>
  );
}

import { useEffect, useRef, useState } from 'react';
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
const FADE_DURATION = 200;

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
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [imageScale]);

  useEffect(() => {
    sleepOverlayOpacity.set(
      withTiming(isSleepMode ? 0.92 : 0, { duration: 1000, easing: Easing.out(Easing.ease) }),
    );
  }, [isSleepMode, sleepOverlayOpacity]);

  const clearHideTimers = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
    hideTimerRef.current = null;
    unmountTimerRef.current = null;
  };

  const fadeOutAndUnmount = () => {
    controlsOpacity.set(withTiming(0, { duration: FADE_DURATION, easing: Easing.out(Easing.ease) }));
    unmountTimerRef.current = setTimeout(() => setControlsVisible(false), FADE_DURATION);
  };

  const scheduleControlsHide = () => {
    clearHideTimers();
    hideTimerRef.current = setTimeout(fadeOutAndUnmount, CONTROL_HIDE_DELAY - FADE_DURATION);
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

  useEffect(() => {
    resetHideTimerRef.current();
    return () => clearHideTimersRef.current();
  }, []);

  const handleScreenTap = () => {
    if (controlsVisible) {
      clearHideTimers();
      fadeOutAndUnmount();
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
        {showPlaceholder || !imageSource ? (
          <View style={styles.placeholder}>
            <ThemedText style={styles.placeholderEmoji}>
              {protagonist?.emoji ?? '📖'}
            </ThemedText>
          </View>
        ) : (
          <Image
            source={imageSource}
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
              <Pressable testID="player-back-button" accessibilityLabel="Go back" onPress={onBack} style={styles.iconButton}>
                <SymbolView
                  name={{ ios: 'chevron.backward', android: 'arrow_back' }}
                  size={24}
                  tintColor={Colors.dark.textPrimary}
                />
              </Pressable>
              <Pressable
                testID="sleep-mode-button"
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
                  {
                    backgroundColor: pressed ? Colors.dark.bgElementHover : Colors.dark.bgElement,
                  },
                ]}
              >
                {isBuffering ? (
                  <ActivityIndicator size="small" color={Colors.dark.textPrimary} />
                ) : (
                  <SymbolView
                    name={
                      isPlaying
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6,10,26,0.55)',
  },
  sleepOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.dark.bgDeepest,
  },
  controls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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

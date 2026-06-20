import { useState, useEffect, useRef, useCallback } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
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
    playStory,
    pause,
    resume,
    seekTo,
    stopStory,
    toggleSleepMode,
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

  const protagonist = PROTAGONISTS.find((p) => p.id === story.protagonist);
  const showPlaceholder = !story.cover_image_url || imageError;
  const progress = duration > 0 ? position / duration : 0;

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
});

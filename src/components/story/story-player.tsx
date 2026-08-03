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
import { Colors, CATEGORY_COLORS, Spacing } from '@/theme';
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
        <Pressable
          testID="player-back-button"
          accessibilityLabel="Go back"
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
      </View>

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
  sleepOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.dark.bgDeepest,
  },
});

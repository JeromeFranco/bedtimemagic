import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

import { BreathingCircle } from '@/components/breathing-circle';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Colors, Spacing } from '@/theme';
import type { Story } from '@/types';

const HIDE_DELAY = 15000;

interface PillowTalkProps {
  story: Story;
  protagonistEmoji: string;
  imageSource: { uri: string } | null;
  onSkip: () => void;
  onImageError: () => void;
}

export function PillowTalk({ story, protagonistEmoji, imageSource, onSkip, onImageError }: PillowTalkProps) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPlaceholder = !imageSource;

  const overlayOpacity = useSharedValue(0.9);
  const overlayAnimatedStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.get() }));

  const screenBrightness = useSharedValue(0.3);
  const screenBrightnessStyle = useAnimatedStyle(() => ({ opacity: screenBrightness.get() }));

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
            source={imageSource}
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
            <Button label="Next" fullWidth onPress={onSkip} />
            <Button label="Skip for tonight" variant="secondary" fullWidth onPress={onSkip} />
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
  dimmingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.dark.overlay,
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
});

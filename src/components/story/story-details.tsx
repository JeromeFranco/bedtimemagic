import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
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
        <Pressable testID="back-button" accessibilityLabel="Go back" onPress={onBack} style={styles.backButton}>
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

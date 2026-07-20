import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { BreathingCircle } from '@/components/breathing-circle';
import { CalmingCopy } from '@/components/calming-copy';
import { ThemedText } from '@/components/themed-text';
import { generateStory } from '@/api/stories';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { Colors, Spacing } from '@/constants/theme';
import type { ChallengeCategory, ChallengeTrigger } from '@/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function GenerateScreen() {
  const { category, trigger } = useLocalSearchParams<{
    category: ChallengeCategory;
    trigger: ChallengeTrigger;
  }>();
  const { selectedProfile } = useSelectedChild();

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedProfile) throw new Error('No profile selected');
      return generateStory(
        selectedProfile.id,
        selectedProfile.protagonist,
        selectedProfile.name,
        selectedProfile.developmental_stage,
        category!,
        trigger!
      );
    },
    onSuccess: (story) => {
      router.replace({
        pathname: '/story',
        params: { id: story.id },
      });
    },
  });

  useEffect(() => {
    if (selectedProfile && category && trigger) {
      mutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProfile, category, trigger]);

  if (mutation.isError) {
    return (
      <ErrorState onRetry={() => mutation.mutate()} onBack={() => router.back()} />
    );
  }

  return (
    <SafeAreaView style={[styles.container, styles.background]}>
      <BreathingCircle />
      <CalmingCopy />
    </SafeAreaView>
  );
}

function ErrorState({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  const retryBgColor = useSharedValue<string>(Colors.dark.bgElement);
  const retryAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: retryBgColor.value,
  }));

  return (
    <SafeAreaView style={[styles.container, styles.background]}>
      <ThemedText style={styles.errorText}>
        Hmm, something went wrong.{"\n"}Let&apos;s try again.
      </ThemedText>
      <AnimatedPressable
        onPress={onRetry}
        onPressIn={() => {
          // eslint-disable-next-line react-hooks/immutability -- reanimated shared value
          retryBgColor.value = withTiming(Colors.dark.bgElementHover, { duration: 150 });
        }}
        onPressOut={() => {
          // eslint-disable-next-line react-hooks/immutability -- reanimated shared value
          retryBgColor.value = withTiming(Colors.dark.bgElement, { duration: 150 });
        }}
        style={[styles.button, retryAnimatedStyle]}
      >
        <ThemedText style={styles.buttonText}>Try Again</ThemedText>
      </AnimatedPressable>
      <Pressable onPress={onBack}>
        <ThemedText style={styles.backText}>Go Back</ThemedText>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.five,
  },
  background: {
    backgroundColor: Colors.dark.bgDeepest,
  },
  errorText: {
    color: Colors.dark.textSecondary,
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
  },
  button: {
    borderRadius: 12,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.dark.textPrimary,
    fontWeight: '500',
    fontSize: 17,
  },
  backText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
});

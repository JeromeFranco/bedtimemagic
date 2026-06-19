import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { GlassView } from 'expo-glass-effect';

import { BreathingCircle } from '@/components/breathing-circle';
import { CalmingCopy } from '@/components/calming-copy';
import { ThemedText } from '@/components/themed-text';
import { generateStory } from '@/api/stories';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { Colors, Spacing } from '@/constants/theme';
import type { ChallengeCategory, ChallengeTrigger } from '@/types';

export default function GenerateScreen() {
  const { category, trigger } = useLocalSearchParams<{
    category: ChallengeCategory;
    trigger: ChallengeTrigger;
  }>();
  const { selectedProfile } = useSelectedChild();

  const mutation = useMutation({
    mutationFn: () =>
      generateStory(
        selectedProfile!.id,
        selectedProfile!.protagonist,
        trigger!
      ),
    onSuccess: () => {
      router.replace('/story' as any);
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
      <SafeAreaView style={[styles.container, styles.background]}>
        <ThemedText style={styles.errorText}>
          Hmm, something went wrong.{"\n"}Let&apos;s try again.
        </ThemedText>
        <Pressable
          onPress={() => mutation.mutate()}
          style={({ pressed }) => [
            styles.button,
            pressed && { opacity: 0.85 },
          ]}
        >
          <GlassView glassEffectStyle="regular" style={styles.buttonGlass}>
            <ThemedText style={styles.buttonText}>Try Again</ThemedText>
          </GlassView>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <ThemedText style={styles.backText}>Go Back</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, styles.background]}>
      <BreathingCircle />
      <CalmingCopy />
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
    backgroundColor: Colors.dark.loadingBackground,
  },
  errorText: {
    color: Colors.dark.textSecondary,
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGlass: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: 16,
  },
  buttonText: {
    color: Colors.dark.text,
    fontWeight: '600',
    fontSize: 16,
  },
  backText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
});

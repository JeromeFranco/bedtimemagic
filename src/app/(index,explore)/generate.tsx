import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { BreathingCircle } from '@/components/breathing-circle';
import { CalmingCopy } from '@/components/calming-copy';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { generateStory } from '@/api/stories';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { Colors, Spacing } from '@/theme';
import type { ChallengeCategory, ChallengeTrigger } from '@/types';

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
  }, [selectedProfile, category, trigger, mutation.mutate]);

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
  return (
    <SafeAreaView style={[styles.container, styles.background]}>
      <ThemedText style={styles.errorText}>
        Hmm, something went wrong.{"\n"}Let&apos;s try again.
      </ThemedText>
      <Button label="Try Again" onPress={onRetry} />
      <Button label="Go Back" variant="ghost" onPress={onBack} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing['2xl'],
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
});

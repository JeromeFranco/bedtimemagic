import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChallengeMatrix } from '@/components/challenge-matrix';
import { ProfileSelector } from '@/components/profile-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { useStoryGeneration } from '@/contexts/StoryGenerationContext';
import { useStories } from '@/hooks/use-story';
import { BottomTabInset, Colors, MaxContentWidth, Spacing } from '@/theme';
import { ChallengeCategory, ChallengeTrigger, PROTAGONISTS } from '@/types';

export default function HomeScreen() {
  const { selectedProfile } = useSelectedChild();
  const { startGeneration } = useStoryGeneration();
  const { data: stories } = useStories(selectedProfile?.id);
  const recentStory = stories && stories.length > 0 ? stories[0] : null;

  const protagonist = selectedProfile
    ? PROTAGONISTS.find((p) => p.id === selectedProfile.protagonist)
    : null;

  const handleGenerate = (category: ChallengeCategory, trigger: ChallengeTrigger) => {
    if (!selectedProfile) return;

    startGeneration({
      childId: selectedProfile.id,
      childName: selectedProfile.name,
      protagonist: selectedProfile.protagonist,
      developmentalStage: selectedProfile.developmental_stage,
      category,
      trigger,
    });
    router.push('/generate');
  };

  const handleReplayPress = () => {
    if (recentStory) {
      router.push({ pathname: '/story', params: { id: recentStory.id } });
    }
  };

  const childName = selectedProfile?.name ?? 'your child';
  const protagonistName = protagonist?.name ?? 'Barnaby';
  const protagonistEmoji = protagonist?.emoji ?? '🐻';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.topRow}>
            <ThemedView style={styles.headerTextSection}>
              <ThemedText style={styles.headline}>
                What&apos;s happening with {childName} tonight?
              </ThemedText>

              <ThemedText style={styles.subtitle}>
                Featuring {protagonistName} {protagonistEmoji} · 10 min bedtime story
              </ThemedText>
            </ThemedView>

            <ProfileSelector />
          </ThemedView>

          <ChallengeMatrix onGenerate={handleGenerate} />

          {recentStory && (
            <View style={styles.replayRow}>
              <Button
                label="Listen to recent story again →"
                variant="ghost"
                onPress={handleReplayPress}
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgBase,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: BottomTabInset + Spacing.xl,
    gap: Spacing.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    backgroundColor: 'transparent',
    marginTop: Spacing.xs,
  },
  headerTextSection: {
    flex: 1,
    gap: Spacing.xs,
    backgroundColor: 'transparent',
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.24,
    color: Colors.dark.textPrimary,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.dark.textSecondary,
  },
  replayRow: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
});

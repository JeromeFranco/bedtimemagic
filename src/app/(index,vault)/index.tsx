import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChallengeMatrix } from '@/components/challenge-matrix';
import { ProfileSelector } from '@/components/profile-selector';
import { RecentStoryCard } from '@/components/recent-story-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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

  const childName = selectedProfile?.name;
  const headline = childName ? `Tonight's story for ${childName}` : "Tonight's story";
  const protagonistName = protagonist?.name ?? 'Barnaby';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.headerRow}>
            <ThemedView style={styles.headerText}>
              <ThemedText type="title" style={styles.headline}>
                {headline}
              </ThemedText>
              <ThemedText type="link" themeColor="textSecondary">
                {`${protagonistName} will tell it · about 10 minutes`}
              </ThemedText>
            </ThemedView>

            <ProfileSelector />
          </ThemedView>

          {recentStory && (
            <RecentStoryCard story={recentStory} onPress={handleReplayPress} />
          )}

          <ThemedView style={styles.newStoryGroup}>
            {recentStory && (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.sectionLabel}
              >
                Or make a new one
              </ThemedText>
            )}
            <ChallengeMatrix onGenerate={handleGenerate} />
          </ThemedView>
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
    gap: Spacing['2xl'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    backgroundColor: 'transparent',
  },
  headerText: {
    flex: 1,
    gap: Spacing.xs,
    backgroundColor: 'transparent',
  },
  headline: {
    letterSpacing: -0.24,
  },
  newStoryGroup: {
    gap: Spacing.sm,
    backgroundColor: 'transparent',
  },
  sectionLabel: {
    fontWeight: '500',
  },
});

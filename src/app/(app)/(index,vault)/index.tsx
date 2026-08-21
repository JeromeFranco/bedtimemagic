import { router } from 'expo-router';
import { Platform, ScrollView, StyleSheet } from 'react-native';

import { ProfileSelector } from '@/components/profile-selector';
import { RecentStoryCard } from '@/components/recent-story-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { StatusBarScrim } from '@/components/ui/status-bar-scrim';
import { useTopChromeInset } from '@/components/ui/use-top-chrome-inset';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { useStoryGeneration } from '@/contexts/StoryGenerationContext';
import { useStories } from '@/hooks/use-story';
import { Colors, MaxContentWidth, Spacing } from '@/theme';
import { PROTAGONISTS } from '@/types';

export default function HomeScreen() {
  const { selectedProfile } = useSelectedChild();
  const { state, resumeWaiting } = useStoryGeneration();
  const topChromeInset = useTopChromeInset({ hasNativeHeader: false });
  const { data: stories } = useStories(selectedProfile?.id);
  const recentStory = stories && stories.length > 0 ? stories[0] : null;

  const protagonist = selectedProfile
    ? PROTAGONISTS.find((p) => p.id === selectedProfile.protagonist)
    : null;

  const handleCreatePress = () => {
    if (state.status === 'generating') {
      resumeWaiting();
      router.push('/generate');
      return;
    }

    if (!selectedProfile) return;

    router.push('/create');
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
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS === 'android' && { paddingTop: topChromeInset + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.content} collapsable={false}>
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

          <Button
            label="Create Tonight's Story"
            fullWidth
            disabled={!selectedProfile && state.status !== 'generating'}
            onPress={handleCreatePress}
          />
        </ThemedView>
      </ScrollView>
      <StatusBarScrim height={topChromeInset} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgBase,
  },
  scrollContent: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  content: {
    alignSelf: 'center',
    gap: Spacing['2xl'],
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.xl,
    width: '100%',
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
});

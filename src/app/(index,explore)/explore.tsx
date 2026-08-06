import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { StoryHistoryCard } from '@/components/story-history-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { useStories } from '@/hooks/use-story';
import { BottomTabInset, Colors, MaxContentWidth, Spacing } from '@/theme';

export default function HistoryVaultScreen() {
  const { data: stories, isLoading, isError } = useStories();

  const handleStoryPress = (storyId: string) => {
    router.push({ pathname: '/story', params: { id: storyId } });
  };

  const handleGenerate = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.dark.textPrimary} />
        <ThemedText themeColor="textSecondary" style={styles.loadingText}>
          Loading stories...
        </ThemedText>
      </ThemedView>
    );
  }

  if (isError) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText style={styles.emptyTitle}>Something went wrong</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.emptyText}>
          Could not load your stories. Try again later.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText style={styles.heading}>Vault</ThemedText>

        {!stories || stories.length === 0 ? (
          <ThemedView style={[styles.container, styles.center]}>
            <ThemedText style={styles.emptyEmoji}>📚</ThemedText>
            <ThemedText style={styles.emptyTitle}>No stories yet</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              Generate your first bedtime story to see it here.
            </ThemedText>
            <Button label="Create a Story" onPress={handleGenerate} />
          </ThemedView>
        ) : (
          <ThemedView style={styles.list}>
            {stories.slice(0, 5).map((story) => (
              <StoryHistoryCard
                key={story.id}
                story={story}
                onPress={() => handleStoryPress(story.id)}
              />
            ))}
          </ThemedView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: BottomTabInset + Spacing.lg,
    paddingTop: Spacing.lg,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  heading: {
    color: Colors.dark.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: Spacing.xl,
  },
  list: {
    gap: Spacing.lg,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
});

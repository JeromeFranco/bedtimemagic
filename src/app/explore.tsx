import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { StoryHistoryCard } from '@/components/story-history-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useStories } from '@/hooks/use-story';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Colors } from '@/constants/theme';

export default function HistoryVaultScreen() {
  const { data: stories, isLoading } = useStories();

  const handleStoryPress = (storyId: string) => {
    router.push({ pathname: '/story', params: { id: storyId } });
  };

  const handleGenerate = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.dark.text} />
        <ThemedText themeColor="textSecondary" style={styles.loadingText}>
          Loading stories...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText style={styles.heading}>Story Vault</ThemedText>

        {!stories || stories.length === 0 ? (
          <ThemedView style={[styles.container, styles.center]}>
            <ThemedText style={styles.emptyEmoji}>📚</ThemedText>
            <ThemedText style={styles.emptyTitle}>No stories yet</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              Generate your first bedtime story to see it here.
            </ThemedText>
            <Pressable
              onPress={handleGenerate}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView type="backgroundElement" style={styles.generateButton}>
                <ThemedText style={styles.generateButtonText}>
                  Create a Story
                </ThemedText>
              </ThemedView>
            </Pressable>
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
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    paddingTop: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
  heading: {
    color: Colors.dark.text,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: Spacing.four,
  },
  list: {
    gap: Spacing.three,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: Spacing.five,
  },
  generateButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 16,
    marginTop: Spacing.two,
  },
  generateButtonText: {
    color: Colors.dark.text,
    fontWeight: '600',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});

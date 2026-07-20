import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { StoryHistoryCard } from '@/components/story-history-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useStories } from '@/hooks/use-story';
import { BottomTabInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HistoryVaultScreen() {
  const { data: stories, isLoading, isError } = useStories();

  const handleStoryPress = (storyId: string) => {
    router.push({ pathname: '/story', params: { id: storyId } });
  };

  const handleGenerate = () => {
    router.push('/');
  };

  const generateBgColor = useSharedValue<string>(Colors.dark.bgElement);
  const generateAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: generateBgColor.value,
  }));

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
            <AnimatedPressable
              onPress={handleGenerate}
              onPressIn={() => {
                // eslint-disable-next-line react-hooks/immutability -- reanimated shared value
                generateBgColor.value = withTiming(Colors.dark.bgElementHover, { duration: 150 });
              }}
              onPressOut={() => {
                // eslint-disable-next-line react-hooks/immutability -- reanimated shared value
                generateBgColor.value = withTiming(Colors.dark.bgElement, { duration: 150 });
              }}
              style={[styles.generateButton, generateAnimatedStyle]}
            >
              <ThemedText style={styles.generateButtonText}>
                Create a Story
              </ThemedText>
            </AnimatedPressable>
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
    color: Colors.dark.textPrimary,
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
    color: Colors.dark.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: Spacing.five,
  },
  generateButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 12,
    marginTop: Spacing.two,
  },
  generateButtonText: {
    color: Colors.dark.textPrimary,
    fontWeight: '500',
    fontSize: 17,
  },

});

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';

import { StoryPlayer } from '@/components/story/story-player';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Colors, Spacing } from '@/theme';
import { PROTAGONISTS } from '@/types';
import { usePlayer } from '@/contexts/PlayerContext';
import { useStory } from '@/hooks/use-story';
import { useCoverImage } from '@/hooks/use-cover-image';
import { prefetchStoryAudio } from '@/lib/audio-utils';
import { getCachedCoverPath, cacheCoverImage } from '@/lib/audio-cache';

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { data: story, isLoading, error } = useStory(id!);
  const { postStoryPhase, stopStory, finishWindDown } = usePlayer();
  const [localCoverPath, setLocalCoverPath] = useState<string | null>(null);
  const { coverUrl } = useCoverImage(story?.id ?? '', story?.title ?? '');
  const storyId = story?.id;
  const storyText = story?.story_text;
  const isPostStoryPhase =
    postStoryPhase === 'fading' ||
    postStoryPhase === 'pillow_talk' ||
    postStoryPhase === 'affirmation' ||
    postStoryPhase === 'fade_to_black';

  const handleBack = useCallback(() => {
    stopStory();
    router.back();
  }, [stopStory]);

  useEffect(() => {
    if (!storyId) return;
    getCachedCoverPath(storyId).then((path) => {
      if (path) setLocalCoverPath(path);
    });
  }, [storyId]);

  useEffect(() => {
    if (coverUrl && storyId && !localCoverPath) {
      cacheCoverImage(storyId, coverUrl)
        .then((path) => setLocalCoverPath(path))
        .catch(() => {});
    }
  }, [coverUrl, localCoverPath, storyId]);

  useEffect(() => {
    if (storyId && storyText) {
      prefetchStoryAudio(storyId, storyText).catch(() => {});
    }
  }, [storyId, storyText]);

  useEffect(() => {
    if (postStoryPhase === 'done') router.back();
  }, [postStoryPhase]);

  useEffect(() => {
    if (!isPostStoryPhase) return;
    return navigation.addListener('beforeRemove', (event) => {
      event.preventDefault();
      finishWindDown();
    });
  }, [finishWindDown, isPostStoryPhase, navigation]);

  useEffect(() => {
    return () => {
      stopStory();
    };
  }, [stopStory]);

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.dark.textPrimary} />
        <ThemedText style={styles.loadingText}>Loading story...</ThemedText>
      </ThemedView>
    );
  }

  if (error || !story) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText style={styles.errorText}>{"Couldn't load this story"}</ThemedText>
        <Button label="Go Back" variant="secondary" onPress={() => router.back()} />
      </ThemedView>
    );
  }

  const protagonist = PROTAGONISTS.find((p) => p.id === story.protagonist);
  const imageSource = localCoverPath
    ? { uri: localCoverPath }
    : coverUrl
      ? { uri: coverUrl }
      : null;

  return (
    <StoryPlayer
      story={story}
      protagonist={protagonist}
      imageSource={imageSource}
      onBack={handleBack}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgBase,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
  },
  errorText: {
    color: Colors.dark.textSecondary,
    fontSize: 17,
    textAlign: 'center',
  },
});

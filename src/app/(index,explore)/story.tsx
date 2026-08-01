import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { StoryDetails } from '@/components/story/story-details';
import { StoryPlayer } from '@/components/story/story-player';
import { PillowTalk } from '@/components/story/pillow-talk';
import { Affirmation } from '@/components/story/affirmation';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/theme';
import { PROTAGONISTS } from '@/types';
import { usePlayer } from '@/contexts/PlayerContext';
import { useStory } from '@/hooks/use-story';
import { useCoverImage } from '@/hooks/use-cover-image';
import { prefetchStoryAudio } from '@/lib/audio-utils';
import { getCachedCoverPath, cacheCoverImage } from '@/lib/audio-cache';

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: story, isLoading, error } = useStory(id!);
  const { postStoryPhase, playStory, stopStory, skipPillowTalk, confirmAffirmation } = usePlayer();

  const [phase, setPhase] = useState<'details' | 'playing'>('details');
  const [localCoverPath, setLocalCoverPath] = useState<string | null>(null);

  const { coverUrl } = useCoverImage(story?.id ?? '', story?.title ?? '');

  useEffect(() => {
    if (!story) return;
    getCachedCoverPath(story.id).then((path) => {
      if (path) setLocalCoverPath(path);
    });
  }, [story?.id]);

  useEffect(() => {
    if (coverUrl && story && !localCoverPath) {
      cacheCoverImage(story.id, coverUrl)
        .then((path) => setLocalCoverPath(path))
        .catch(() => {});
    }
  }, [coverUrl, story?.id, localCoverPath]);

  useEffect(() => {
    if (story?.id && story?.story_text) {
      prefetchStoryAudio(story.id, story.story_text).catch(() => {});
    }
  }, [story?.id, story?.story_text]);

  useEffect(() => {
    if (postStoryPhase === 'done') {
      router.back();
    }
  }, [postStoryPhase]);

  useEffect(() => {
    return () => {
      stopStory();
    };
  }, []);

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
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && { backgroundColor: Colors.dark.bgElement },
          ]}
        >
          <ThemedText style={styles.secondaryButtonText}>Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const protagonist = PROTAGONISTS.find((p) => p.id === story.protagonist);
  const imageSource = localCoverPath
    ? { uri: localCoverPath }
    : coverUrl
    ? { uri: coverUrl }
    : null;

  if (postStoryPhase === 'pillow_talk') {
    return (
      <PillowTalk
        story={story}
        protagonistEmoji={protagonist?.emoji ?? '📖'}
        imageSource={imageSource}
        onSkip={skipPillowTalk}
        onImageError={() => {}}
      />
    );
  }

  if (postStoryPhase === 'affirmation') {
    return (
      <Affirmation
        text={story.sleepy_affirmation}
        onConfirm={confirmAffirmation}
      />
    );
  }

  if (phase === 'playing') {
    return (
      <StoryPlayer
        story={story}
        protagonist={protagonist}
        imageSource={imageSource}
        onBack={() => {
          stopStory();
          router.back();
        }}
      />
    );
  }

  return (
    <StoryDetails
      story={story}
      protagonist={protagonist}
      imageSource={imageSource}
      onBack={() => router.back()}
      onPlay={() => {
        playStory(story);
        setPhase('playing');
      }}
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
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.dark.borderDefault,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    marginTop: Spacing.sm,
  },
  secondaryButtonText: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
});

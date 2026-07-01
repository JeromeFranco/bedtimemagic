import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { GlassView } from 'expo-glass-effect';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { PROTAGONISTS } from '@/types';
import { preFetchAudio } from '@/lib/audio-utils';
import { useCoverImage } from '@/hooks/use-cover-image';
import { getCachedCoverPath, cacheCoverImage } from '@/lib/audio-cache';
import type { Story } from '@/types';

export default function StoryScreen() {
  const { story: storyJson } = useLocalSearchParams<{ story: string }>();
  const [localCoverPath, setLocalCoverPath] = useState<string | null>(null);

  let story: Story;
  try {
    story = JSON.parse(storyJson!);
  } catch {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>No story data</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText style={styles.backText}>Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const { coverUrl, isLoading: coverLoading } = useCoverImage(
    story.id,
    story.title
  );

  useEffect(() => {
    getCachedCoverPath(story.id).then((path) => {
      if (path) setLocalCoverPath(path);
    });
  }, [story.id]);

  useEffect(() => {
    if (coverUrl && !localCoverPath) {
      cacheCoverImage(story.id, coverUrl)
        .then((path) => setLocalCoverPath(path))
        .catch(() => {});
    }
  }, [coverUrl, story.id, localCoverPath]);

  useEffect(() => {
    if (story?.id && story?.story_text) {
      preFetchAudio(story.id, story.story_text).catch(() => {});
    }
  }, [story?.id, story?.story_text]);

  const protagonist = PROTAGONISTS.find((p) => p.id === story.protagonist);
  const imageSource = localCoverPath
    ? { uri: localCoverPath }
    : coverUrl
    ? { uri: coverUrl }
    : null;

  const handlePlay = () => {
    router.push({ pathname: '/player', params: { story: storyJson } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.imageContainer}>
        {imageSource ? (
          <Image
            source={imageSource}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          <ThemedView style={styles.placeholder}>
            <ThemedText style={styles.placeholderEmoji}>
              {protagonist?.emoji ?? '📖'}
            </ThemedText>
            <ThemedText style={styles.placeholderText}>
              Cover art is being painted...
            </ThemedText>
          </ThemedView>
        )}
        <ThemedView style={styles.gradientOverlay} />
      </ThemedView>

      <ThemedView style={styles.content}>
        <ThemedText style={styles.protagonist}>
          {protagonist?.emoji ?? '📖'} {protagonist?.name ?? 'Friend'}
        </ThemedText>
        <ThemedText style={styles.title}>{story.title}</ThemedText>
        <ThemedText style={styles.moral}>{story.moral}</ThemedText>

        <Pressable
          onPress={handlePlay}
          style={({ pressed }) => [
            styles.playButton,
            pressed && { opacity: 0.85 },
          ]}
        >
          <GlassView glassEffectStyle="regular" style={styles.playButtonGlass}>
            <ThemedText style={styles.playButtonText}>Play Story</ThemedText>
          </GlassView>
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    borderBottomColor: Colors.dark.background,
    borderBottomWidth: 80,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.loadingBackground,
    gap: Spacing.three,
  },
  placeholderEmoji: {
    fontSize: 64,
  },
  placeholderText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  protagonist: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '700',
  },
  moral: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.two,
  },
  playButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  playButtonGlass: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: 16,
    alignItems: 'center',
  },
  playButtonText: {
    color: Colors.dark.text,
    fontWeight: '600',
    fontSize: 17,
  },
  errorText: {
    color: Colors.dark.textSecondary,
    fontSize: 18,
    textAlign: 'center',
  },
  backText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginTop: Spacing.two,
  },
});

import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { router, Stack, useLocalSearchParams, useNavigation } from 'expo-router';

import { StoryPlayer } from '@/components/story/story-player';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { NativeHeaderIconButton } from '@/components/ui/native-header-icon-button';
import { StatusBarScrim } from '@/components/ui/status-bar-scrim';
import { useTopChromeInset } from '@/components/ui/use-top-chrome-inset';
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
  const { isSleepMode, postStoryPhase, stopStory, toggleSleepMode, finishWindDown } = usePlayer();
  const topChromeInset = useTopChromeInset({ hasNativeHeader: true });
  const [localCoverPath, setLocalCoverPath] = useState<string | null>(null);
  const { coverUrl } = useCoverImage(story?.id ?? '', story?.title ?? '');
  const storyId = story?.id;
  const storyText = story?.story_text;
  const isPostStoryPhase =
    postStoryPhase === 'fading' ||
    postStoryPhase === 'pillow_talk' ||
    postStoryPhase === 'affirmation' ||
    postStoryPhase === 'fade_to_black';

  const isTerminalPhase = postStoryPhase === 'fade_to_black' || postStoryPhase === 'done';

  const handleBack = () => {
    if (postStoryPhase === 'idle') {
      stopStory();
      router.back();
    } else if (!isTerminalPhase) {
      finishWindDown();
    }
  };

  const headerOptions = {
    headerLeft: isTerminalPhase
      ? undefined
      : () => (
        <NativeHeaderIconButton
          action="back"
          accessibilityLabel="Go back"
          onPress={handleBack}
          testID="story-header-back"
        />
      ),
    headerRight: postStoryPhase === 'idle'
      ? () => (
        <NativeHeaderIconButton
          action="sleep"
          accessibilityLabel={isSleepMode ? 'Sleep Mode on' : 'Sleep Mode'}
          onPress={toggleSleepMode}
          testID="story-header-sleep"
        />
      )
      : undefined,
  };

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
        <Stack.Screen options={headerOptions} />
        <ActivityIndicator size="large" color={Colors.dark.textPrimary} />
        <ThemedText style={styles.loadingText}>Loading story...</ThemedText>
        <StatusBarScrim height={topChromeInset} />
      </ThemedView>
    );
  }

  if (error || !story) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <Stack.Screen options={headerOptions} />
        <ThemedText style={styles.errorText}>{"Couldn't load this story"}</ThemedText>
        <StatusBarScrim height={topChromeInset} />
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
    <ThemedView style={styles.container}>
      <Stack.Screen options={headerOptions} />
      <StoryPlayer
        story={story}
        protagonist={protagonist}
        imageSource={imageSource}
        topInset={topChromeInset}
      />
      <StatusBarScrim height={topChromeInset} />
    </ThemedView>
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

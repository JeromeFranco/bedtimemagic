import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { getCachedCoverPath } from '@/lib/audio-cache';
import { CHALLENGE_TRIGGERS, PROTAGONISTS, type Story } from '@/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface StoryHistoryCardProps {
  story: Story;
  onPress: () => void;
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export function StoryHistoryCard({ story, onPress }: StoryHistoryCardProps) {
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const bgColor = useSharedValue<string>(Colors.dark.bgElement);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: bgColor.value,
  }));

  const protagonist = PROTAGONISTS.find((p) => p.id === story.protagonist);
  const challenge = CHALLENGE_TRIGGERS.find((c) => c.id === story.challenge);

  useEffect(() => {
    getCachedCoverPath(story.id).then(setCoverPath).catch(() => {});
  }, [story.id]);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        bgColor.set(withTiming(Colors.dark.bgElementHover, { duration: 150 }));
      }}
      onPressOut={() => {
        bgColor.set(withTiming(Colors.dark.bgElement, { duration: 150 }));
      }}
      style={[styles.card, animatedStyle]}
    >
        <View style={styles.coverContainer}>
          {coverPath ? (
            <Image source={{ uri: coverPath }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <ThemedText style={styles.coverEmoji}>
                {protagonist?.emoji ?? '📖'}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <ThemedText numberOfLines={2} style={styles.title}>
            {story.title}
          </ThemedText>

          <View style={styles.metadata}>
            <ThemedText themeColor="textSecondary" style={styles.metaText}>
              {protagonist?.emoji} {protagonist?.name ?? 'Friend'}
            </ThemedText>
            {challenge && (
              <ThemedText themeColor="textSecondary" style={styles.metaText}>
                {challenge.label}
              </ThemedText>
            )}
          </View>

          <ThemedText themeColor="textSecondary" style={styles.date}>
            {formatRelativeDate(story.created_at)}
          </ThemedText>
        </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    gap: Spacing.three,
  },

  coverContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    margin: Spacing.three,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.bgDeepest,
  },
  coverEmoji: {
    fontSize: 32,
  },
  content: {
    flex: 1,
    paddingVertical: Spacing.three,
    paddingRight: Spacing.three,
    justifyContent: 'center',
    gap: Spacing.one,
  },
  title: {
    color: Colors.dark.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metaText: {
    fontSize: 13,
  },
  date: {
    fontSize: 12,
  },
});

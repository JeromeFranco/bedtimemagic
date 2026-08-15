import { Image, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { PressableFeedback } from '@/components/ui/pressable-feedback';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/theme';
import { PROTAGONISTS, type Story } from '@/types';

interface RecentStoryCardProps {
  story: Story;
  onPress: () => void;
}

export function RecentStoryCard({ story, onPress }: RecentStoryCardProps) {
  const protagonist = PROTAGONISTS.find((p) => p.id === story.protagonist);
  const protagonistName = protagonist?.name ?? 'a friend';
  const hasCover = Boolean(story.cover_image_url);

  return (
    <View style={styles.shell}>
      <PressableFeedback
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Listen to ${story.title} again`}
        style={styles.content}
      >
        <View style={styles.coverContainer}>
          {hasCover ? (
            <Image
              source={{ uri: story.cover_image_url as string }}
              style={styles.cover}
              resizeMode="cover"
              testID="recent-cover-image"
            />
          ) : (
            <View testID="recent-cover-placeholder" style={styles.coverPlaceholder} />
          )}
        </View>

        <View style={styles.text}>
          <ThemedText type="link" style={styles.title} numberOfLines={2}>
            {story.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {`${protagonistName} · 10 min`}
          </ThemedText>
        </View>

        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={17}
          tintColor={Colors.dark.textMuted}
        />
      </PressableFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: Colors.dark.bgSurface,
    borderColor: Colors.dark.borderSubtle,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  coverContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.dark.bgElement,
  },
  text: {
    flex: 1,
    gap: Spacing.xs,
  },
  title: {
    fontWeight: '700',
  },
});

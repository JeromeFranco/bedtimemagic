import { StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';

export default function StoryScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.text}>Story Card (US-1.4)</ThemedText>
      <ThemedText
        style={styles.link}
        onPress={() => router.back()}
      >
        Go Back
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    gap: Spacing.three,
  },
  text: {
    fontSize: 18,
  },
  link: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
});

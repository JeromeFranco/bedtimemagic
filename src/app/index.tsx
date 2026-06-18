import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileSelector } from '@/components/profile-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ProfileSelector />

        <ThemedView style={styles.centerContent}>
          <ThemedText type="title" style={styles.title}>
            Bedtime Magic
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
            Create a personalized story for tonight
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.bottomSection}>
          <Pressable style={styles.generateButton}>
            <ThemedText type="default" style={styles.generateButtonText}>
              Generate Tonight&apos;s Story
            </ThemedText>
          </Pressable>
        </ThemedView>
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
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  bottomSection: {
    paddingBottom: Spacing.two,
  },
  generateButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#ffffff',
    fontWeight: 600,
    fontSize: 18,
  },
});

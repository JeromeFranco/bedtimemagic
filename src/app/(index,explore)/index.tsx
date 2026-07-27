import { StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ChallengeMatrix } from '@/components/challenge-matrix';
import { ProfileSelector } from '@/components/profile-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { useStories } from '@/hooks/use-story';
import { PROTAGONISTS, ChallengeCategory, ChallengeTrigger } from '@/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HomeScreen() {
  const { selectedProfile } = useSelectedChild();
  const { data: stories } = useStories(selectedProfile?.id);
  const recentStory = stories && stories.length > 0 ? stories[0] : null;

  const protagonist = selectedProfile
    ? PROTAGONISTS.find((p) => p.id === selectedProfile.protagonist)
    : null;

  const handleGenerate = (category: ChallengeCategory, trigger: ChallengeTrigger) => {
    router.push({ pathname: '/generate', params: { category, trigger } });
  };

  const handleReplayPress = () => {
    if (recentStory) {
      router.push({ pathname: '/story', params: { id: recentStory.id } });
    }
  };

  const replayBgColor = useSharedValue<string>('transparent');
  const replayAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: replayBgColor.value,
  }));

  const childName = selectedProfile?.name ?? 'your child';
  const protagonistName = protagonist?.name ?? 'Barnaby';
  const protagonistEmoji = protagonist?.emoji ?? '🐻';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.topRow}>
            <ThemedView style={styles.headerTextSection}>
              <ThemedText style={styles.headline}>
                What&apos;s happening with {childName} tonight?
              </ThemedText>

              <ThemedText style={styles.subtitle}>
                Featuring {protagonistName} {protagonistEmoji} · 10 min bedtime story
              </ThemedText>
            </ThemedView>

            <ProfileSelector />
          </ThemedView>

          <ChallengeMatrix onGenerate={handleGenerate} />

          {recentStory && (
            <AnimatedPressable
              onPress={handleReplayPress}
              onPressIn={() => {
                replayBgColor.set(withTiming(Colors.dark.bgElementHover, { duration: 150 }));
              }}
              onPressOut={() => {
                replayBgColor.set(withTiming('transparent', { duration: 150 }));
              }}
              style={[styles.replayButton, replayAnimatedStyle]}
            >
              <ThemedText style={styles.replayText}>
                Listen to recent story again →
              </ThemedText>
            </AnimatedPressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgBase,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    backgroundColor: 'transparent',
    marginTop: Spacing.one,
  },
  headerTextSection: {
    flex: 1,
    gap: Spacing.one,
    backgroundColor: 'transparent',
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.24,
    color: Colors.dark.textPrimary,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.dark.textSecondary,
  },
  replayButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.twoHalf,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
    marginTop: Spacing.two,
    minHeight: 44,
    justifyContent: 'center',
  },
  replayText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
});

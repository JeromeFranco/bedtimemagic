import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ChallengeMatrix } from '@/components/challenge-matrix';
import { ChallengeCategory, ChallengeTrigger } from '@/types';
import { ProfileSelector } from '@/components/profile-selector';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const handleGenerate = (category: ChallengeCategory, trigger: ChallengeTrigger) => {
    router.push({ pathname: '/generate', params: { category, trigger } });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ProfileSelector />
        <ChallengeMatrix onGenerate={handleGenerate} />
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
});

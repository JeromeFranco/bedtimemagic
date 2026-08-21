import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useProfileDraft } from '@/contexts/ProfileDraftContext';
import { Colors, Layout, Motion, Spacing } from '@/theme';

export default function WelcomeScreen() {
  const { begin } = useProfileDraft();

  const handleStart = () => {
    begin('onboarding');
    router.push('/details');
  };

  return (
    <View style={styles.container}>
      <Animated.View
        entering={FadeIn
          .duration(Motion.pressDuration)
          .easing(Easing.out(Easing.quad))
          .reduceMotion(ReduceMotion.System)}
        style={styles.content}
      >
        <View style={styles.copy}>
          <ThemedText type="hero">
            Turn bedtime battles into life lessons.
          </ThemedText>
          <ThemedText type="body" themeColor="textSecondary">
            Make bedtime calmer for your family.
          </ThemedText>
        </View>
        <Button
          label="Create Tonight’s Story"
          onPress={handleStart}
          fullWidth
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: Colors.dark.bgDeepest,
    paddingHorizontal: Spacing.xl,
  },
  content: {
    alignSelf: 'center',
    gap: Spacing['3xl'],
    maxWidth: Layout.maxContentWidth,
    width: '100%',
  },
  copy: {
    gap: Spacing.lg,
  },
});

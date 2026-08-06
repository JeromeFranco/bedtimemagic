import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BreathingCircle } from '@/components/breathing-circle';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Colors, Spacing } from '@/theme';

interface AffirmationProps {
  text: string;
  onConfirm: () => void;
}

export function Affirmation({ text, onConfirm }: AffirmationProps) {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
        <Animated.View style={styles.centerContent} entering={FadeIn.duration(800)}>
          <BreathingCircle size={200} testID="breathing-circle" />
          <ThemedText style={styles.affirmationText}>{text}</ThemedText>
        </Animated.View>

        <View style={styles.buttonContainer}>
          <Button label="Goodnight" fullWidth onPress={onConfirm} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgDeepest,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingHorizontal: Spacing['2xl'],
  },
  affirmationText: {
    color: Colors.dark.textPrimary,
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 36,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.lg,
  },
});

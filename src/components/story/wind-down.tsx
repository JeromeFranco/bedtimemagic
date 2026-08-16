import { ScrollView, StyleSheet, View } from 'react-native';

import { BreathingCircle } from '@/components/breathing-circle';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/theme';

interface WindDownContentProps {
  text: string;
  label: string;
  circleSize: number;
}

export function WindDownContent({ text, label, circleSize }: WindDownContentProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.textGroup}>
        <ThemedText
          accessibilityRole="header"
          themeColor="textSecondary"
          type="small"
          style={styles.label}
        >
          {label}
        </ThemedText>
        <ThemedText type="heading" style={styles.windDownText}>
          {text}
        </ThemedText>
      </View>
      <View style={styles.breathingContainer}>
        <BreathingCircle size={circleSize} testID="breathing-circle" />
      </View>
    </ScrollView>
  );
}

export function PillowTalkContent({ prompt }: { prompt: string }) {
  return <WindDownContent text={prompt} label="Pillow talk" circleSize={120} />;
}

export function AffirmationContent({ text }: { text: string }) {
  return <WindDownContent text={text} label="Say together" circleSize={160} />;
}

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  textGroup: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  label: {
    textAlign: 'center',
  },
  windDownText: {
    textAlign: 'center',
  },
  breathingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing['2xl'],
  },
});

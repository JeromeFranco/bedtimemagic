import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontWeights, Spacing } from '@/theme';
import { Card } from '@/ui/card';

export type SelectionRowProps = {
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
  testID?: string;
};

/** A full-width, accessible choice for progressively disclosed lists. */
export function SelectionRow({
  label,
  onPress,
  accessibilityHint,
  testID,
}: SelectionRowProps) {
  return (
    <Card
      onPress={onPress}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      testID={testID}
      contentStyle={styles.content}
    >
      <ThemedText type="body" style={styles.label}>
        {label}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
  },
  label: {
    fontWeight: FontWeights.medium,
  },
});

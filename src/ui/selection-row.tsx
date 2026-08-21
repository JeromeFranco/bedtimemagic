import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, FontWeights, Spacing } from '@/theme';
import { Card } from '@/ui/card';

export type SelectionRowProps = {
  label: string;
  onPress: () => void;
  supportingText?: string;
  selected?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
};

/** A full-width, accessible choice for progressively disclosed lists. */
export function SelectionRow({
  label,
  onPress,
  supportingText,
  selected,
  disabled,
  accessibilityHint,
  testID,
}: SelectionRowProps) {
  const participatesInChoiceSet = selected !== undefined;

  return (
    <Card
      onPress={onPress}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={supportingText ? `${label}, ${supportingText}` : label}
      accessibilityRole={participatesInChoiceSet ? 'radio' : 'button'}
      accessibilityState={{
        ...(participatesInChoiceSet ? { selected } : {}),
        ...(disabled ? { disabled: true } : {}),
      }}
      disabled={disabled}
      testID={testID}
      style={selected && styles.selected}
      contentStyle={styles.content}
    >
      <View style={styles.copy}>
        <ThemedText type="body" style={styles.label}>
          {label}
        </ThemedText>
        {supportingText ? (
          <ThemedText type="small" themeColor="textSecondary">
            {supportingText}
          </ThemedText>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  selected: {
    backgroundColor: Colors.dark.bgSelected,
    borderColor: Colors.dark.borderDefault,
  },
  content: {
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
  },
  copy: {
    gap: Spacing.xs,
  },
  label: {
    fontWeight: FontWeights.medium,
  },
});

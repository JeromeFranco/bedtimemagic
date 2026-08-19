import type { PropsWithChildren } from 'react';
import {
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { PressableFeedback } from '@/components/ui/pressable-feedback';
import { Colors, Layout } from '@/theme';

type InteractiveChipProps = Pick<
  PressableProps,
  'accessibilityHint' | 'accessibilityLabel' | 'accessibilityRole' | 'testID'
>;

export type ChipProps = PropsWithChildren<InteractiveChipProps & {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}>;

/**
 * Reusable pill-shaped chip with optional native press feedback.
 *
 * Static chips render their content in a regular View and do not create a
 * Pressable.
 */
export function Chip({
  children,
  onPress,
  style,
  contentStyle,
  accessibilityHint,
  accessibilityLabel,
  accessibilityRole,
  testID,
}: ChipProps) {
  const content = onPress ? (
    <PressableFeedback
      onPress={onPress}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      testID={testID}
      style={[styles.content, contentStyle]}
    >
      {children}
    </PressableFeedback>
  ) : (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  return <View style={[styles.base, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.dark.bgElement,
    borderColor: Colors.dark.borderSubtle,
    borderRadius: 24,
    borderWidth: 1,
    minHeight: Layout.chipHeight,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

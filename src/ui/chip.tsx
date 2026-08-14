import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableFeedback } from '@/components/ui/pressable-feedback';
import { Colors, Spacing } from '@/theme';

export type ChipProps = PropsWithChildren<{
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
export function Chip({ children, onPress, style, contentStyle }: ChipProps) {
  const content = onPress ? (
    <PressableFeedback onPress={onPress} style={[styles.content, contentStyle]}>
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
    minHeight: 40,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

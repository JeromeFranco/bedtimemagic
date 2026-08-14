import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableFeedback } from '@/components/ui/pressable-feedback';
import { Colors, Spacing } from '@/theme';

export type CardProps = PropsWithChildren<{
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}>;

/**
 * Reusable card surface with optional native press feedback.
 *
 * The outer view clips the feedback to the card's rounded corners. Static
 * cards render their content in a regular View and do not create a Pressable.
 */
export function Card({ children, onPress, style, contentStyle }: CardProps) {
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
    backgroundColor: Colors.dark.bgSurface,
    borderColor: Colors.dark.borderSubtle,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
});

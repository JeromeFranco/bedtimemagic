import type { PropsWithChildren } from 'react';
import {
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { PressableFeedback } from '@/components/ui/pressable-feedback';
import { Colors, Spacing } from '@/theme';

type InteractiveCardProps = Pick<
  PressableProps,
  | 'accessibilityHint'
  | 'accessibilityLabel'
  | 'accessibilityRole'
  | 'accessibilityState'
  | 'disabled'
  | 'testID'
>;

export type CardProps = PropsWithChildren<InteractiveCardProps & {
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
export function Card({
  children,
  onPress,
  style,
  contentStyle,
  accessibilityHint,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  disabled,
  testID,
}: CardProps) {
  const content = onPress ? (
    <PressableFeedback
      onPress={onPress}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      disabled={disabled}
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

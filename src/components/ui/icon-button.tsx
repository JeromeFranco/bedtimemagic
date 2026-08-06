import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { PressableFeedback } from '@/components/ui/pressable-feedback';
import { Colors, Layout } from '@/theme';

type IconButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
  /** Diameter in points. Defaults to the minimum touch target. */
  size?: number;
  /** `filled` draws an element background; `bare` stays transparent. */
  variant?: 'filled' | 'bare';
  disabled?: boolean;
  testID?: string;
};

/**
 * Circular icon control with native press feedback via PressableFeedback.
 */
export function IconButton({
  onPress,
  accessibilityLabel,
  children,
  size = Layout.minTouchTarget,
  variant = 'filled',
  disabled,
  testID,
}: IconButtonProps) {
  return (
    <PressableFeedback
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      rippleColor={Colors.dark.bgElementHover}
      rippleBorderless
      rippleRadius={size / 2}
      pressedOpacity={0.7}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        variant === 'filled' && styles.filled,
      ]}
    >
      {children}
    </PressableFeedback>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  filled: {
    backgroundColor: Colors.dark.bgElement,
  },
});

import { StyleSheet, View } from 'react-native';

import { PressableFeedback } from '@/components/ui/pressable-feedback';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Colors, FontSizes, Layout, Spacing } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'default' | 'compact';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Visual density. Compact keeps a 44 px minimum touch target for inline actions. */
  size?: ButtonSize;
  /** Stretch to the full width proposed by the surrounding layout (CTAs). */
  fullWidth?: boolean;
  disabled?: boolean;
  testID?: string;
};

const colors = Colors.dark;

const shellStyles: Record<ButtonVariant, object> = {
  primary: {
    backgroundColor: colors.bgElement,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  ghost: {},
};

const innerStyles: Record<ButtonVariant, object> = {
  primary: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  secondary: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  ghost: {},
};

const labelColors: Record<ButtonVariant, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  ghost: colors.textSecondary,
};

/**
 * Design-system button built on PressableFeedback with native platform press
 * feedback (Android ripple, iOS opacity).
 *
 * primary/secondary render an outer clipping shell (borderRadius + overflow:
 * hidden) wrapping a Pressable that carries the ripple + content, so the
 * bounded Android ripple is clipped to the rounded corners. ghost has no
 * surface and stays a bare PressableFeedback.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  fullWidth = false,
  disabled,
  testID,
}: ButtonProps) {
  if (variant === 'ghost') {
    return (
      <PressableFeedback
        onPress={onPress}
        disabled={disabled}
        testID={testID}
        accessibilityRole="button"
        style={[
          fullWidth && styles.fullWidth,
          size === 'compact' && styles.compactGhost,
        ]}
      >
        <ThemedText
          style={{
            color: labelColors[variant],
            fontSize: FontSizes.body,
            fontWeight: '500',
            textAlign: 'center',
          }}
        >
          {label}
        </ThemedText>
      </PressableFeedback>
    );
  }

  return (
    <View style={[shellStyles[variant], fullWidth && styles.fullWidth]}>
      <PressableFeedback
        onPress={onPress}
        disabled={disabled}
        testID={testID}
        accessibilityRole="button"
        style={[innerStyles[variant], size === 'compact' && styles.compactNormal]}
      >
        <ThemedText
          style={{
            color: labelColors[variant],
            fontSize: FontSizes.body,
            fontWeight: '500',
            textAlign: 'center',
          }}
        >
          {label}
        </ThemedText>
      </PressableFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  compactNormal: {
    justifyContent: 'center',
    minHeight: Layout.minTouchTarget,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  compactGhost: {
    justifyContent: 'center',
    minHeight: Layout.minTouchTarget,
    paddingHorizontal: Spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
});

import { StyleSheet, View } from 'react-native';

import { PressableFeedback } from '@/components/ui/pressable-feedback';
import { ThemedText } from '@/components/themed-text';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
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
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  secondary: {
    flex: 1,
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
 * hidden) wrapping a flex:1 Pressable that carries the ripple + content, so the
 * bounded Android ripple is clipped to the rounded corners. ghost has no
 * surface and stays a bare PressableFeedback.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
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
        style={fullWidth && styles.fullWidth}
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
        style={innerStyles[variant]}
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
  fullWidth: {
    width: '100%',
  },
});

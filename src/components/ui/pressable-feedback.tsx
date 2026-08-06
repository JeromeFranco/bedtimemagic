import { Platform, Pressable, type PressableProps } from 'react-native';

export type PressableFeedbackProps = PressableProps & {
  /** Color for the Android ripple drawable. Defaults to a semi-transparent white. */
  rippleColor?: string;
  /** Whether the ripple is borderless (circular). Defaults to false. */
  rippleBorderless?: boolean;
  /** Ripple radius in points. */
  rippleRadius?: number;
  /** Opacity when pressed on iOS. Defaults to 0.7. */
  pressedOpacity?: number;
};

/**
 * Pressable wrapper that applies native platform press feedback:
 * - **Android:** RippleDrawable via `android_ripple`
 * - **iOS:** Opacity reduction on press
 *
 * No reanimated dependency — the platform handles the animation.
 * Use this for any interactive surface (buttons, cards, chips, rows).
 */
export function PressableFeedback({
  rippleColor = 'rgba(255, 255, 255, 0.2)',
  rippleBorderless = false,
  rippleRadius,
  pressedOpacity = 0.7,
  style,
  ...rest
}: PressableFeedbackProps) {
  return (
    <Pressable
      {...rest}
      android_ripple={{
        color: rippleColor,
        borderless: rippleBorderless,
        ...(rippleRadius !== undefined ? { radius: rippleRadius } : {}),
      }}
      style={(state) => {
        const pressed = state.pressed;
        const base = typeof style === 'function' ? style(state) : style;
        return [base, Platform.OS === 'ios' && pressed && { opacity: pressedOpacity }];
      }}
    />
  );
}

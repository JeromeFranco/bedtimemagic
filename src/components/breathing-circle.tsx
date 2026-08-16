import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/theme';

const DEFAULT_SIZE = 120;
const DEFAULT_COLOR = Colors.dark.accentSoft;
const DURATION = 4000;

interface BreathingCircleProps {
  size?: number;
  color?: string;
  testID?: string;
}

export function BreathingCircle({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  testID,
}: BreathingCircleProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (reducedMotion) {
      scale.set(1);
      opacity.set(0.3);
    } else {
      scale.set(
        withRepeat(
          withTiming(1.15, { duration: DURATION / 2, easing: Easing.inOut(Easing.ease) }),
          -1,
          true,
        ),
      );
      opacity.set(
        withRepeat(
          withTiming(0.6, { duration: DURATION / 2, easing: Easing.inOut(Easing.ease) }),
          -1,
          true,
        ),
      );
    }

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [opacity, reducedMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
    opacity: opacity.get(),
  }));

  return (
    <Animated.View
      testID={testID}
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

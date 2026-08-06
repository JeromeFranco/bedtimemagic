import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { CATEGORY_COLORS, Colors } from '@/theme';

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
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    scale.set(
      withRepeat(
        withTiming(1.15, { duration: DURATION / 2, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );

    opacity.set(
      withRepeat(
        withTiming(0.6, { duration: DURATION / 2, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
    opacity: opacity.get(),
  }));

  const dynamicStyles = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
  };

  return (
    <Animated.View
      testID={testID}
      style={[styles.circle, dynamicStyles, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  circle: {
    shadowColor: CATEGORY_COLORS.bedtime.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
});

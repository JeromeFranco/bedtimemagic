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

const DEFAULT_SIZE = 120;
const DEFAULT_COLOR = 'rgba(139, 92, 246, 0.2)';
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
    scale.value = withRepeat(
      withTiming(1.15, { duration: DURATION / 2, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    opacity.value = withRepeat(
      withTiming(0.6, { duration: DURATION / 2, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
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
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
});

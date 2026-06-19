import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const SIZE = 120;
const DURATION = 4000;

export function BreathingCircle() {
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
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.circle, animatedStyle]} />
  );
}

const styles = StyleSheet.create({
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
});

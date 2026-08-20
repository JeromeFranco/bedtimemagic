import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { Colors, Spacing } from '@/theme';

type StatusBarScrimProps = {
  /** Measured status and optional native-header height. */
  height: number;
};

/**
 * Decorative, fixed system-chrome treatment that keeps light status icons legible.
 */
export function StatusBarScrim({ height }: StatusBarScrimProps) {
  return (
    <LinearGradient
      accessible={false}
      colors={[Colors.dark.systemBarScrimTop, Colors.dark.systemBarScrimBottom]}
      end={{ x: 0, y: 1 }}
      pointerEvents="none"
      start={{ x: 0, y: 0 }}
      style={[styles.scrim, { height: height + Spacing.xl }]}
      testID="status-bar-scrim"
    />
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    bottom: undefined,
  },
});

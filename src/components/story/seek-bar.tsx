import { useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/theme';
import { formatDuration } from '@/lib/utils';

interface SeekBarProps {
  progress: number;
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
}

export function SeekBar({ progress, position, duration, onSeek }: SeekBarProps) {
  const [thumbScale] = useState(() => new Animated.Value(1));
  const [trackWidth, setTrackWidth] = useState(1);

  const seekToLocationX = (locationX: number) => {
    const fraction = Math.max(0, Math.min(1, locationX / trackWidth));
    onSeek(fraction * duration);
  };

  const startGrow = () =>
    Animated.timing(thumbScale, {
      toValue: 18 / 14,
      duration: 150,
      useNativeDriver: true,
    }).start();

  const startShrink = () =>
    Animated.timing(thumbScale, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();

  const { panHandlers } = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      seekToLocationX(e.nativeEvent.locationX);
      startGrow();
    },
    onPanResponderMove: (e) => {
      seekToLocationX(e.nativeEvent.locationX);
    },
    onPanResponderRelease: (e) => {
      seekToLocationX(e.nativeEvent.locationX);
      startShrink();
    },
    onPanResponderTerminate: () => {
      startShrink();
    },
  });

  return (
    <View style={styles.container}>
      <View
        testID="seek-bar-track"
        style={styles.track}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...panHandlers}
      >
        <View pointerEvents="none" style={styles.trackBg} />
        <View pointerEvents="none" style={[styles.fill, { width: `${progress * 100}%` }]} />
        <Animated.View
          pointerEvents="none"
          style={[styles.thumb, { left: `${progress * 100}%` }, { transform: [{ scale: thumbScale }] }]}
        />
      </View>
      <View style={styles.timeRow}>
        <ThemedText style={styles.timeText}>{formatDuration(Math.floor(position))}</ThemedText>
        <ThemedText style={styles.timeText}>{formatDuration(Math.floor(duration))}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  track: {
    height: 44,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBg: {
    height: 4,
    backgroundColor: Colors.dark.track,
    borderRadius: 2,
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
  },
  fill: {
    height: 4,
    backgroundColor: Colors.dark.textPrimary,
    borderRadius: 2,
    position: 'absolute',
    top: 20,
    left: 0,
  },
  thumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.dark.textPrimary,
    position: 'absolute',
    top: 15,
    marginLeft: -7,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
  },
});

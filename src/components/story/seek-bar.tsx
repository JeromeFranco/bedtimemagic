import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

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
  const trackWidth = useSharedValue(1);
  const thumbScale = useSharedValue(1);

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: thumbScale.value }],
  }));

  const handleSeek = useCallback(
    (locationX: number) => {
      const fraction = Math.max(0, Math.min(1, locationX / trackWidth.value));
      onSeek(fraction * duration);
    },
    [duration, onSeek, trackWidth],
  );

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      thumbScale.set(withTiming(18 / 14, { duration: 150 }));
    })
    .onUpdate((event) => {
      const fraction = Math.max(0, Math.min(1, event.x / trackWidth.value));
      onSeek(fraction * duration);
    })
    .onFinalize(() => {
      thumbScale.set(withTiming(1, { duration: 150 }));
    });

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Pressable
          testID="seek-bar-track"
          style={styles.track}
          onPress={(e) => handleSeek(e.nativeEvent.locationX)}
          onLayout={(e) => {
            trackWidth.set(e.nativeEvent.layout.width);
          }}
        >
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          <Animated.View
            style={[styles.thumb, { left: `${progress * 100}%` }, thumbAnimatedStyle]}
          />
        </Pressable>
      </GestureDetector>
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

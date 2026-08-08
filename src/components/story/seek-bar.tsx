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
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<{ progress: number; seconds: number } | null>(null);

  const previewFromLocationX = (locationX: number) => {
    const fraction = Math.max(0, Math.min(1, locationX / trackWidth));
    return { fraction, seconds: fraction * duration };
  };

  let displayProgress = progress;
  let displayPosition = position;
  if (preview) {
    if (isDragging) {
      displayProgress = preview.progress;
      displayPosition = preview.seconds;
    } else if (
      Math.abs(progress - preview.progress) >= 0.01 &&
      Math.abs(position - preview.seconds) >= 0.75
    ) {
      displayProgress = preview.progress;
      displayPosition = preview.seconds;
    }
  }

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
      const { fraction, seconds } = previewFromLocationX(e.nativeEvent.locationX);
      setPreview({ progress: fraction, seconds });
      setIsDragging(true);
      startGrow();
    },
    onPanResponderMove: (e) => {
      const { fraction, seconds } = previewFromLocationX(e.nativeEvent.locationX);
      setPreview({ progress: fraction, seconds });
    },
    onPanResponderRelease: (e) => {
      const { fraction, seconds } = previewFromLocationX(e.nativeEvent.locationX);
      const next = { progress: fraction, seconds };
      setPreview(next);
      setIsDragging(false);
      startShrink();
      onSeek(seconds);
    },
    onPanResponderTerminate: () => {
      setPreview(null);
      setIsDragging(false);
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
        <View pointerEvents="none" style={[styles.fill, { width: `${displayProgress * 100}%` }]} />
        <Animated.View
          pointerEvents="none"
          style={[styles.thumb, { left: `${displayProgress * 100}%` }, { transform: [{ scale: thumbScale }] }]}
        />
      </View>
      <View style={styles.timeRow}>
        <ThemedText style={styles.timeText}>{formatDuration(Math.floor(displayPosition))}</ThemedText>
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

import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';

const MESSAGES = [
  'Breathe in slowly...',
  'Let the day drift away...',
  "Tonight's story is almost ready...",
  'Feel the calm settle in...',
];

const ROTATION_INTERVAL = 5000;

export function CalmingCopy() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % MESSAGES.length);
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return (
    <Animated.View
      key={index}
      entering={FadeIn.duration(800)}
      exiting={FadeOut.duration(800)}
      style={styles.container}
    >
      <ThemedText themeColor="textSecondary" style={styles.text}>{MESSAGES[index]}</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
});

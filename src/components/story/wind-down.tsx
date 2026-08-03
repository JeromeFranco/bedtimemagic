import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

import { BreathingCircle } from '@/components/breathing-circle';
import { ThemedText } from '@/components/themed-text';
import type { PostStoryPhase } from '@/contexts/PlayerContext';
import { Spacing } from '@/theme';

interface GestureHintCueProps {
  phase: PostStoryPhase;
  hintStyle?: StyleProp<AnimatedStyle<ViewStyle>>;
}

export function GestureHintCue({ phase, hintStyle }: GestureHintCueProps) {
  const hintText = phase === 'pillow_talk' ? 'Swipe for Affirmation →' : 'Swipe for Goodnight ↑';
  return (
    <Animated.View style={[styles.hintContainer, hintStyle]}>
      <ThemedText style={styles.hintText}>{hintText}</ThemedText>
    </Animated.View>
  );
}

interface WindDownContentProps {
  text: string;
  postStoryPhase: PostStoryPhase;
}

export function WindDownContent({ text }: WindDownContentProps) {
  return (
    <View style={styles.contentContainer}>
      <ThemedText style={styles.windDownText}>{text}</ThemedText>
      <View style={styles.breathingContainer}>
        <BreathingCircle size={140} testID="breathing-circle" />
      </View>
    </View>
  );
}

export function PillowTalkContent({ prompt }: { prompt: string }) {
  return <WindDownContent text={prompt} postStoryPhase="pillow_talk" />;
}

export function AffirmationContent({ text }: { text: string }) {
  return <WindDownContent text={text} postStoryPhase="affirmation" />;
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.xl,
  },
  windDownText: {
    color: '#E2E0F0',
    fontSize: 23,
    fontWeight: '400',
    lineHeight: 34,
    textAlign: 'center',
  },
  breathingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  hintContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  hintText: {
    color: '#E2E0F0',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    opacity: 0.7,
  },
});

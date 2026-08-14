import { useCallback, useEffect, useRef } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';

import { BreathingCircle } from '@/components/breathing-circle';
import { CalmingCopy } from '@/components/calming-copy';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useStoryGeneration } from '@/contexts/StoryGenerationContext';
import { Colors, Spacing } from '@/theme';

export default function GenerateScreen() {
  const navigation = useNavigation();
  const {
    state,
    continueInBackground,
    cancelGeneration,
    retryGeneration,
    takeReadyStory,
    dismissStatus,
  } = useStoryGeneration();
  const hasTakenReadyStoryRef = useRef(false);
  const hasObservedLifecycleRef = useRef(state.status !== 'idle');
  const allowNextRemovalRef = useRef(false);

  useEffect(() => {
    if (state.status !== 'idle') {
      hasObservedLifecycleRef.current = true;
    }
  }, [state.status]);

  const leaveAfterConfirmation = useCallback((leave: () => void) => {
    allowNextRemovalRef.current = true;
    leave();
  }, []);

  const confirmLeave = useCallback((leave: () => void) => {
    Alert.alert(
      'Leave story generation?',
      'You can keep creating while you look around, or cancel this story request.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Keep Creating',
          onPress: () => {
            continueInBackground();
            leaveAfterConfirmation(leave);
          },
        },
        {
          text: 'Cancel Story',
          style: 'destructive',
          onPress: () => {
            cancelGeneration();
            leaveAfterConfirmation(leave);
          },
        },
      ],
    );
  }, [cancelGeneration, continueInBackground, leaveAfterConfirmation]);

  useEffect(() => {
    if (state.status !== 'generating') return;

    return navigation.addListener('beforeRemove', (event) => {
      if (allowNextRemovalRef.current) {
        allowNextRemovalRef.current = false;
        return;
      }
      event.preventDefault();
      confirmLeave(() => navigation.dispatch(event.data.action));
    });
  }, [confirmLeave, navigation, state.status]);

  useEffect(() => {
    if (
      state.status !== 'idle'
      || hasTakenReadyStoryRef.current
      || hasObservedLifecycleRef.current
    ) return;
    router.replace('/');
  }, [state.status]);

  useEffect(() => {
    if (state.status !== 'ready' || state.hasLeftGenerationScreen) return;

    const story = takeReadyStory();
    if (!story) return;
    hasTakenReadyStoryRef.current = true;
    router.replace({ pathname: '/story', params: { id: story.id } });
  }, [state, takeReadyStory]);

  if (state.status === 'idle') return null;

  if (state.status === 'failed') {
    return (
      <ErrorState
        onRetry={retryGeneration}
        onBack={() => {
          dismissStatus();
          router.back();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, styles.background]}>
      <BreathingCircle />
      <CalmingCopy />
      {state.status === 'generating' && (
        <Button label="Leave" variant="ghost" onPress={() => confirmLeave(() => router.back())} />
      )}
    </SafeAreaView>
  );
}

function ErrorState({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  return (
    <SafeAreaView style={[styles.container, styles.background]}>
      <ThemedText style={styles.errorText}>
        Hmm, something went wrong.{"\n"}Let&apos;s try again.
      </ThemedText>
      <Button label="Try Again" onPress={onRetry} />
      <Button label="Go Back" variant="ghost" onPress={onBack} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing['2xl'],
  },
  background: {
    backgroundColor: Colors.dark.bgDeepest,
  },
  errorText: {
    color: Colors.dark.textSecondary,
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
  },
});

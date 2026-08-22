import { useCallback, useEffect, useRef } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { router, Stack, useNavigation } from 'expo-router';

import { BreathingCircle } from '@/components/breathing-circle';
import { CalmingCopy } from '@/components/calming-copy';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { NativeHeaderIconButton } from '@/components/ui/native-header-icon-button';
import { StatusBarScrim } from '@/components/ui/status-bar-scrim';
import { useTopChromeInset } from '@/components/ui/use-top-chrome-inset';
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
  const topChromeInset = useTopChromeInset({ hasNativeHeader: true });
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

  const handleHeaderBack = () => {
    if (state.status === 'failed') {
      dismissStatus();
    }
    router.back();
  };

  if (state.status === 'idle') return null;

  if (state.status === 'failed') {
    return (
      <>
        <Stack.Screen
          options={{
            headerLeft: () => (
              <NativeHeaderIconButton
                action="back"
                accessibilityLabel="Go back"
                onPress={handleHeaderBack}
                testID="generate-header-back"
              />
            ),
          }}
        />
        <ErrorState onRetry={retryGeneration} topChromeInset={topChromeInset} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <NativeHeaderIconButton
              action="back"
              accessibilityLabel="Go back"
              onPress={handleHeaderBack}
              testID="generate-header-back"
            />
          ),
        }}
      />
      <ThemedView style={[styles.container, styles.background, { paddingTop: topChromeInset }]}>
        <BreathingCircle />
        <CalmingCopy />
        <StatusBarScrim height={topChromeInset} />
      </ThemedView>
    </>
  );
}

function ErrorState({ onRetry, topChromeInset }: { onRetry: () => void; topChromeInset: number }) {
  return (
    <ThemedView style={[styles.container, styles.background, { paddingTop: topChromeInset }]}>
      <ThemedText style={styles.errorText}>
        Hmm, something went wrong.{"\n"}Let&apos;s try again.
      </ThemedText>
      <Button label="Try Again" onPress={onRetry} />
      <StatusBarScrim height={topChromeInset} />
    </ThemedView>
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

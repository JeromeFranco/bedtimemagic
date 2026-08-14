import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { PressableFeedback } from '@/components/ui/pressable-feedback';
import { useStoryGeneration } from '@/contexts/StoryGenerationContext';
import { BorderRadius, Colors, Layout, MaxContentWidth, Spacing } from '@/theme';

function displayName(name: string) {
  return name.trim() || 'your child';
}

export function StoryGenerationStatus() {
  const pathname = usePathname();
  const { state, resumeWaiting, takeReadyStory, retryGeneration, dismissStatus } = useStoryGeneration();
  const lastAnnouncedStateRef = useRef<typeof state | null>(null);

  const isOrdinaryTabRoute = pathname === '/' || pathname === '/explore';
  const isVisible = state.status !== 'idle'
    && state.hasLeftGenerationScreen
    && isOrdinaryTabRoute;

  useEffect(() => {
    if (
      !isVisible
      || Platform.OS !== 'ios'
      || lastAnnouncedStateRef.current === state
    ) return;

    const childName = displayName(state.snapshot.childName);
    const message = state.status === 'generating'
      ? `Writing ${childName}'s story`
      : state.status === 'ready'
        ? `${childName}'s story is ready`
        : `We couldn't finish ${childName}'s story`;

    lastAnnouncedStateRef.current = state;
    AccessibilityInfo.announceForAccessibility(message);
  }, [isVisible, state]);

  if (!isVisible) return null;

  const childName = displayName(state.snapshot.childName);

  if (state.status === 'generating') {
    return (
      <PressableFeedback
        accessibilityRole="button"
        accessibilityLabel={`Writing ${childName}'s story. Return to story generation.`}
        onPress={() => {
          resumeWaiting();
          router.push('/generate');
        }}
        style={styles.card}
      >
        <ActivityIndicator
          color={Colors.dark.textPrimary}
          accessibilityLabel="Story generation in progress"
        />
        <ThemedText style={styles.title}>Writing {childName}&apos;s story…</ThemedText>
      </PressableFeedback>
    );
  }

  if (state.status === 'ready') {
    return (
      <View
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${childName}'s story is ready`}
        style={styles.card}
      >
        <ThemedText style={styles.title}>{childName}&apos;s story is ready</ThemedText>
        <View style={styles.actions}>
          <Button
            label="Listen"
            size="compact"
            onPress={() => {
              const story = takeReadyStory();
              if (story) router.push({ pathname: '/story', params: { id: story.id } });
            }}
          />
          <Button label="Dismiss" variant="ghost" size="compact" onPress={dismissStatus} />
        </View>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`We couldn't finish ${childName}'s story`}
      style={styles.card}
    >
      <ThemedText style={styles.title}>We couldn&apos;t finish {childName}&apos;s story.</ThemedText>
      <View style={styles.actions}>
        <Button label="Try Again" size="compact" onPress={retryGeneration} />
        <Button label="Dismiss" variant="ghost" size="compact" onPress={dismissStatus} />
      </View>
    </View>
  );
}

export function StoryGenerationStatusOverlay() {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.overlay, { paddingBottom: Layout.bottomTabInset + insets.bottom + Spacing.sm }]}
    >
      <View pointerEvents="box-none" style={styles.content}>
        <StoryGenerationStatus />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  content: {
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
    paddingHorizontal: Spacing.md,
  },
  card: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Colors.dark.bgSurface,
    borderColor: Colors.dark.borderDefault,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    minHeight: Layout.minTouchTarget,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    color: Colors.dark.textPrimary,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});

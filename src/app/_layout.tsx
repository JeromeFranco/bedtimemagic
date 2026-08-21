import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BootstrapError } from '@/components/onboarding/bootstrap-error';
import { AuthProvider } from '@/contexts/AuthContext';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { ProfileDraftProvider } from '@/contexts/ProfileDraftContext';
import { SelectedChildProvider } from '@/contexts/SelectedChildContext';
import { StoryGenerationProvider } from '@/contexts/StoryGenerationContext';
import { queryClient } from '@/lib/query-client';
import { Colors } from '@/theme';

function RootNavigator() {
  const { status, retryBootstrap } = useOnboarding();

  if (status === 'loading') {
    return <View style={styles.loading} />;
  }

  if (status === 'authError') {
    return <BootstrapError onRetry={retryBootstrap} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'required'}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'ready'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <SelectedChildProvider>
            <OnboardingProvider>
              <ProfileDraftProvider>
                <StoryGenerationProvider>
                  <PlayerProvider>
                    <ThemeProvider value={DarkTheme}>
                      <RootNavigator />
                    </ThemeProvider>
                  </PlayerProvider>
                </StoryGenerationProvider>
              </ProfileDraftProvider>
            </OnboardingProvider>
          </SelectedChildProvider>
        </QueryClientProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    backgroundColor: Colors.dark.bgDeepest,
  },
});

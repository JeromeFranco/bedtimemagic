import { DarkTheme, ThemeProvider } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { queryClient } from '@/lib/query-client';
import { SelectedChildProvider } from '@/contexts/SelectedChildContext';
import { PlayerProvider } from '@/contexts/PlayerContext';

export default function TabLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SelectedChildProvider>
        <PlayerProvider>
          <ThemeProvider value={DarkTheme}>
            <AnimatedSplashOverlay />
            <AppTabs />
          </ThemeProvider>
        </PlayerProvider>
      </SelectedChildProvider>
    </QueryClientProvider>
  );
}

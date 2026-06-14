import { QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, ThemeProvider } from "expo-router";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { SelectedChildProvider } from "@/contexts/SelectedChildContext";
import { queryClient } from "@/lib/query-client";

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

import { QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, ThemeProvider } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { SelectedChildProvider } from "@/contexts/SelectedChildContext";
import { queryClient } from "@/lib/query-client";

export default function TabLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
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
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

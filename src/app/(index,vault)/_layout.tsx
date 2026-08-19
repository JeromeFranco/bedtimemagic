import Stack from "expo-router/stack";

import { Colors } from '@/theme';

export const unstable_settings = {
  index: { anchor: "index" },
  vault: { anchor: "vault" },
};

export default function Layout({ segment }: { segment: string }) {
  const activeTab = segment.match(/\((.*)\)/)?.[1]!;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name={activeTab} />
      <Stack.Screen
        name="create"
        options={{
          headerShown: true,
          title: 'Create a story',
          headerStyle: { backgroundColor: Colors.dark.bgBase },
          headerTintColor: Colors.dark.textPrimary,
          headerTitleStyle: { color: Colors.dark.textPrimary },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen name="generate" />
      <Stack.Screen name="story" />
    </Stack>
  );
}

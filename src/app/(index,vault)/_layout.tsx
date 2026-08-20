import { router } from 'expo-router';
import Stack from 'expo-router/stack';

import { NativeHeaderIconButton } from '@/components/ui/native-header-icon-button';
import { Colors } from '@/theme';

export const unstable_settings = {
  index: { anchor: "index" },
  vault: { anchor: "vault" },
};

const transparentHeaderOptions = {
  headerShown: true,
  headerTransparent: true,
  headerShadowVisible: false,
  headerTintColor: Colors.dark.textPrimary,
  headerTitleStyle: { color: Colors.dark.textPrimary },
  headerBackVisible: false,
} as const;

export default function Layout({ segment }: { segment: string }) {
  const activeTab = segment.match(/\((.*)\)/)?.[1]!;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name={activeTab} />
      <Stack.Screen
        name="create"
        options={{
          ...transparentHeaderOptions,
          title: 'Create a story',
          headerLeft: () => (
            <NativeHeaderIconButton
              action="back"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
            />
          ),
        }}
      />
      <Stack.Screen name="generate" options={transparentHeaderOptions} />
      <Stack.Screen name="story" options={transparentHeaderOptions} />
    </Stack>
  );
}

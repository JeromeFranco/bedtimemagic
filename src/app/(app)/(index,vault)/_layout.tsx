import Stack from 'expo-router/stack';

import { transparentHeaderOptions } from '@/components/ui/transparent-header-options';

export const unstable_settings = {
  index: { anchor: "index" },
  vault: { anchor: "vault" },
};

export default function Layout({ segment }: { segment: string }) {
  const activeTab = segment.match(/\((.*)\)/)?.[1]!;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name={activeTab} />
      <Stack.Screen name="create" options={transparentHeaderOptions} />
      <Stack.Screen name="profile/details" options={transparentHeaderOptions} />
      <Stack.Screen name="profile/protagonist" options={transparentHeaderOptions} />
      <Stack.Screen name="generate" options={transparentHeaderOptions} />
      <Stack.Screen name="story" options={transparentHeaderOptions} />
    </Stack>
  );
}

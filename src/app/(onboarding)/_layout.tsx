import Stack from 'expo-router/stack';

import { transparentHeaderOptions } from '@/components/ui/transparent-header-options';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="details" options={transparentHeaderOptions} />
      <Stack.Screen name="protagonist" options={transparentHeaderOptions} />
    </Stack>
  );
}

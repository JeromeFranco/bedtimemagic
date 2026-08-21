import { router } from 'expo-router';
import Stack from 'expo-router/stack';

import { NativeHeaderIconButton } from '@/components/ui/native-header-icon-button';
import { Colors } from '@/theme';

const transparentHeaderOptions = {
  headerShown: true,
  headerTransparent: true,
  headerShadowVisible: false,
  headerTintColor: Colors.dark.textPrimary,
  headerTitleStyle: { color: Colors.dark.textPrimary },
  headerBackVisible: false,
  headerLeft: () => (
    <NativeHeaderIconButton
      action="back"
      accessibilityLabel="Go back"
      onPress={() => router.back()}
    />
  ),
} as const;

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="details"
        options={{ ...transparentHeaderOptions, title: 'Profile details' }}
      />
      <Stack.Screen
        name="protagonist"
        options={{ ...transparentHeaderOptions, title: 'Story friend' }}
      />
    </Stack>
  );
}

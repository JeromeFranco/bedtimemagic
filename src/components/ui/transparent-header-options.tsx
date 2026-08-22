import { router } from 'expo-router';

import { NativeHeaderIconButton } from './native-header-icon-button';
import { Colors } from '@/theme';

export const transparentHeaderOptions = {
  headerShown: true,
  headerTransparent: true,
  headerShadowVisible: false,
  headerTintColor: Colors.dark.textPrimary,
  headerTitleStyle: { color: Colors.dark.textPrimary },
  headerBackVisible: false,
  title: '',
  headerLeft: () => (
    <NativeHeaderIconButton
      action="back"
      accessibilityLabel="Go back"
      onPress={() => router.back()}
    />
  ),
} as const;
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Layout, Spacing } from '@/theme';

type UseTopChromeInsetOptions = {
  hasNativeHeader: boolean;
};

/**
 * Public-API-safe top inset for screen-owned system chrome and transparent headers.
 */
export function useTopChromeInset({ hasNativeHeader }: UseTopChromeInsetOptions) {
  const insets = useSafeAreaInsets();
  const nativeHeaderHeight = Platform.OS === 'android'
    ? Layout.minTouchTarget + Spacing.md
    : Layout.minTouchTarget;

  return insets.top + (hasNativeHeader ? nativeHeaderHeight : 0);
}

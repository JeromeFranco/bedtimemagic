import { SymbolView } from 'expo-symbols';

import { IconButton } from '@/components/ui/icon-button';
import { Colors } from '@/theme';

type NativeHeaderIconButtonProps = {
  action: 'back' | 'sleep';
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
};

const symbols = {
  back: { ios: 'chevron.backward', android: 'arrow_back' },
  sleep: { ios: 'moon.fill', android: 'bedtime' },
} as const;

/** Circular action for Expo Router's native-header item slots. */
export function NativeHeaderIconButton({
  action,
  onPress,
  accessibilityLabel,
  testID,
}: NativeHeaderIconButtonProps) {
  return (
    <IconButton
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      testID={testID}
    >
      <SymbolView
        name={symbols[action]}
        size={24}
        tintColor={Colors.dark.textPrimary}
      />
    </IconButton>
  );
}

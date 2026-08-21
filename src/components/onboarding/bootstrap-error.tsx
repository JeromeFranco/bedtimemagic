import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Colors, Layout, Spacing } from '@/theme';

type BootstrapErrorProps = {
  onRetry: () => void;
};

export function BootstrapError({ onRetry }: BootstrapErrorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title">We couldn’t get bedtime ready.</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          Check your connection and try again.
        </ThemedText>
        <Button label="Try Again" onPress={onRetry} fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.bgDeepest,
    paddingHorizontal: Spacing.xl,
  },
  content: {
    gap: Spacing.xl,
    maxWidth: Layout.maxContentWidth,
    width: '100%',
  },
});

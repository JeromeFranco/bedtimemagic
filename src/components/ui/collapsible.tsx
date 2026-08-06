import { SymbolView } from 'expo-symbols';
import { PropsWithChildren, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PressableFeedback } from '@/components/ui/pressable-feedback';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/theme';
import { useTheme } from '@/hooks/use-theme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();

  return (
    <ThemedView>
      <PressableFeedback
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
      >
        <ThemedView type="bgElement" style={styles.button}>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={14}
            weight="bold"
            tintColor={theme.textPrimary}
            style={{ transform: [{ rotate: isOpen ? '-90deg' : '90deg' }] }}
          />
        </ThemedView>

        <ThemedText type="small">{title}</ThemedText>
      </PressableFeedback>
      {isOpen && (
        <Animated.View entering={FadeIn.duration(200)}>
          <ThemedView type="bgElement" style={styles.content}>
            {children}
          </ThemedView>
        </Animated.View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dark.bgBase,
  },

  button: {
    width: Spacing.xl,
    height: Spacing.xl,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    marginTop: Spacing.lg,
    borderRadius: Spacing.lg,
    marginLeft: Spacing.xl,
    padding: Spacing.xl,
  },
});

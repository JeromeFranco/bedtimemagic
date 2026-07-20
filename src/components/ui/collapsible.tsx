import { SymbolView } from 'expo-symbols';
import { PropsWithChildren, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();
  const bgColor = useSharedValue<string>(Colors.dark.bgBase);
  const animatedStyle = useAnimatedStyle(() => ({ backgroundColor: bgColor.value }));

  return (
    <ThemedView>
      <AnimatedPressable
        style={[styles.heading, animatedStyle]}
        onPress={() => setIsOpen((value) => !value)}
        onPressIn={() => {
          // eslint-disable-next-line react-hooks/immutability -- reanimated shared value
          bgColor.value = withTiming(Colors.dark.bgElementHover, { duration: 150 });
        }}
        onPressOut={() => {
          // eslint-disable-next-line react-hooks/immutability -- reanimated shared value
          bgColor.value = withTiming(Colors.dark.bgBase, { duration: 150 });
        }}
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
      </AnimatedPressable>
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
    gap: Spacing.two,
  },

  button: {
    width: Spacing.four,
    height: Spacing.four,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    marginTop: Spacing.three,
    borderRadius: Spacing.three,
    marginLeft: Spacing.four,
    padding: Spacing.four,
  },
});

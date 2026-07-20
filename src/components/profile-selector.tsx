import { useState } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ProfileAvatar } from '@/components/profile-avatar';
import { ProfileSheet } from '@/components/profile-sheet';
import { ThemedText } from '@/components/themed-text';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { Colors, Spacing } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ProfileSelector() {
  const { selectedProfile } = useSelectedChild();
  const [sheetVisible, setSheetVisible] = useState(false);
  const bgColor = useSharedValue<string>(Colors.dark.bgElement);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: bgColor.value,
  }));

  if (!selectedProfile) return null;

  return (
    <>
      <AnimatedPressable
        style={[styles.selector, animatedStyle]}
        onPress={() => setSheetVisible(true)}
        onPressIn={() => {
          // eslint-disable-next-line react-hooks/immutability -- reanimated shared value
          bgColor.value = withTiming(Colors.dark.bgElementHover, { duration: 150 });
        }}
        onPressOut={() => {
          // eslint-disable-next-line react-hooks/immutability -- reanimated shared value
          bgColor.value = withTiming(Colors.dark.bgElement, { duration: 150 });
        }}
      >
        <ProfileAvatar emoji={selectedProfile.emoji} size={40} />
        <ThemedText type="default" style={styles.name}>
          {selectedProfile.name}
        </ThemedText>
        <ThemedText style={styles.chevron}>›</ThemedText>
      </AnimatedPressable>

      <ProfileSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
  },
  name: {
    flex: 1,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 24,
    color: Colors.dark.textMuted,
  },
});

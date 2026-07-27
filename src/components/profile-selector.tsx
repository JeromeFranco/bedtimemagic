import { useState } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ProfileAvatar } from '@/components/profile-avatar';
import { ProfileSheet } from '@/components/profile-sheet';
import { useSelectedChild } from '@/contexts/SelectedChildContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ProfileSelector() {
  const { selectedProfile } = useSelectedChild();
  const [sheetVisible, setSheetVisible] = useState(false);
  const opacity = useSharedValue<number>(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!selectedProfile) return null;

  return (
    <>
      <AnimatedPressable
        style={[styles.avatarButton, animatedStyle]}
        onPress={() => setSheetVisible(true)}
        onPressIn={() => {
          opacity.set(withTiming(0.7, { duration: 150 }));
        }}
        onPressOut={() => {
          opacity.set(withTiming(1, { duration: 150 }));
        }}
        accessibilityLabel={`Profile: ${selectedProfile.name}`}
        accessibilityRole="button"
      >
        <ProfileAvatar emoji={selectedProfile.emoji} size={40} />
      </AnimatedPressable>

      <ProfileSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  avatarButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
});

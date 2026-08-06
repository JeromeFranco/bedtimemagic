import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/theme';

interface ProfileAvatarProps {
  emoji: string;
  size?: number;
}

export function ProfileAvatar({ emoji, size = 40 }: ProfileAvatarProps) {
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      <ThemedText style={{ fontSize: size * 0.5 }}>{emoji}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.avatarTint,
  },
});

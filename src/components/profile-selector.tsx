import { useState } from 'react';
import { StyleSheet, Pressable } from 'react-native';

import { ProfileAvatar } from '@/components/profile-avatar';
import { ProfileSheet } from '@/components/profile-sheet';
import { ThemedText } from '@/components/themed-text';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { Spacing } from '@/constants/theme';

export function ProfileSelector() {
  const { selectedProfile } = useSelectedChild();
  const [sheetVisible, setSheetVisible] = useState(false);

  if (!selectedProfile) return null;

  return (
    <>
      <Pressable style={styles.selector} onPress={() => setSheetVisible(true)}>
        <ProfileAvatar emoji={selectedProfile.emoji} size={40} />
        <ThemedText type="default" style={styles.name}>
          {selectedProfile.name}
        </ThemedText>
        <ThemedText style={styles.chevron}>›</ThemedText>
      </Pressable>

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
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  name: {
    flex: 1,
    fontWeight: 600,
  },
  chevron: {
    fontSize: 24,
    opacity: 0.5,
  },
});

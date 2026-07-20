import { StyleSheet, View, Pressable, Modal } from 'react-native';

import { ProfileAvatar } from '@/components/profile-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { Spacing, Colors } from '@/constants/theme';
import type { ChildProfile } from '@/types';
import { DEVELOPMENTAL_STAGES } from '@/types';

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

function getStageLabel(stage: ChildProfile['developmental_stage']): string {
  return DEVELOPMENTAL_STAGES.find((s) => s.id === stage)?.label ?? stage;
}

export function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
  const { profiles, selectedProfile, setSelectedProfile } = useSelectedChild();

  const handleSelect = (profile: ChildProfile) => {
    setSelectedProfile(profile);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ThemedView style={styles.handle} />
          <ThemedText type="subtitle" style={styles.title}>
            Switch Profile
          </ThemedText>

          {profiles.map((profile) => (
            <Pressable
              key={profile.id}
              style={[
                styles.profileRow,
                selectedProfile?.id === profile.id && styles.profileRowSelected,
              ]}
              onPress={() => handleSelect(profile)}
            >
              <ProfileAvatar emoji={profile.emoji} size={44} />
              <View style={styles.profileInfo}>
                <ThemedText type="default" style={styles.profileName}>
                  {profile.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {getStageLabel(profile.developmental_stage)}
                </ThemedText>
              </View>
              {selectedProfile?.id === profile.id && (
                <ThemedText style={styles.check}>✓</ThemedText>
              )}
            </Pressable>
          ))}

          <Pressable style={[styles.addProfileRow, styles.addProfileRowDisabled]} disabled>
            <ThemedText type="default" themeColor="textSecondary">
              + Add Profile
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Coming Soon
            </ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: Colors.dark.bgElement,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.textMuted,
    alignSelf: 'center',
    marginBottom: Spacing.three,
  },
  title: {
    marginBottom: Spacing.three,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    marginBottom: Spacing.one,
  },
  profileRowSelected: {
    backgroundColor: Colors.dark.bgSelected,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontWeight: '500',
  },
  check: {
    fontSize: 18,
    color: Colors.dark.textPrimary,
  },
  addProfileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    marginTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.borderSubtle,
  },
  addProfileRowDisabled: {
    opacity: 0.5,
  },
});

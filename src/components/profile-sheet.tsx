import { router } from 'expo-router';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { useProfileDraft } from '@/contexts/ProfileDraftContext';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { BorderRadius, Colors, Spacing } from '@/theme';
import type { ChildProfile } from '@/types';
import { DEVELOPMENTAL_STAGES } from '@/types';
import { SelectionRow } from '@/ui/selection-row';

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

function getStageLabel(stage: ChildProfile['developmental_stage']): string {
  return DEVELOPMENTAL_STAGES.find((item) => item.id === stage)?.label ?? stage;
}

export function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
  const { profiles, selectedProfile, setSelectedProfile } = useSelectedChild();
  const { begin } = useProfileDraft();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const handleSelect = (profile: ChildProfile) => {
    setSelectedProfile(profile);
    onClose();
  };

  const handleAddProfile = () => {
    onClose();
    begin('add');
    router.push('/profile/details');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        />
        <View
          style={[
            styles.sheet,
            {
              maxHeight: height - insets.top - Spacing.xl,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <ThemedView style={styles.handle} />
          <ThemedText type="subtitle" style={styles.title}>
            Switch profile
          </ThemedText>

          <ScrollView
            style={styles.profileScroll}
            contentContainerStyle={styles.profiles}
            accessibilityRole="radiogroup"
            showsVerticalScrollIndicator={false}
          >
            {profiles.map((profile) => (
              <SelectionRow
                key={profile.id}
                label={profile.name}
                supportingText={getStageLabel(profile.developmental_stage)}
                selected={selectedProfile?.id === profile.id}
                onPress={() => handleSelect(profile)}
                testID={`profile-${profile.id}`}
              />
            ))}
          </ScrollView>

          <View style={styles.addProfile}>
            <Button
              label="Add Profile"
              variant="ghost"
              fullWidth
              onPress={handleAddProfile}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.dark.scrim,
  },
  sheet: {
    backgroundColor: Colors.dark.bgElement,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  handle: {
    width: Spacing['3xl'],
    height: Spacing.xs,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.dark.textMuted,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.lg,
  },
  profileScroll: {
    flexShrink: 1,
  },
  profiles: {
    gap: Spacing.sm,
  },
  addProfile: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.borderSubtle,
    marginTop: Spacing.lg,
    paddingTop: Spacing.sm,
  },
});

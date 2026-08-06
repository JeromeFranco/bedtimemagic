import { useState } from 'react';

import { ProfileAvatar } from '@/components/profile-avatar';
import { ProfileSheet } from '@/components/profile-sheet';
import { IconButton } from '@/components/ui/icon-button';
import { useSelectedChild } from '@/contexts/SelectedChildContext';

export function ProfileSelector() {
  const { selectedProfile } = useSelectedChild();
  const [sheetVisible, setSheetVisible] = useState(false);

  if (!selectedProfile) return null;

  return (
    <>
      <IconButton
        variant="bare"
        onPress={() => setSheetVisible(true)}
        accessibilityLabel={`Profile: ${selectedProfile.name}`}
      >
        <ProfileAvatar emoji={selectedProfile.emoji} size={40} />
      </IconButton>

      <ProfileSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />
    </>
  );
}

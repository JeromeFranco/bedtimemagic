import { useState } from 'react';

import { ProfileSheet } from '@/components/profile-sheet';
import { Button } from '@/components/ui/button';
import { useSelectedChild } from '@/contexts/SelectedChildContext';

export function ProfileSelector() {
  const { selectedProfile } = useSelectedChild();
  const [sheetVisible, setSheetVisible] = useState(false);

  if (!selectedProfile) return null;

  return (
    <>
      <Button
        label="Switch profile"
        variant="ghost"
        size="compact"
        onPress={() => setSheetVisible(true)}
      />
      <ProfileSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />
    </>
  );
}

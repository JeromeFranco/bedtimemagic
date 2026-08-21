import { router } from 'expo-router';

import { ProtagonistSelectionScreen } from '@/components/profile/protagonist-selection-screen';
import { useSelectedChild } from '@/contexts/SelectedChildContext';

export default function AddProfileProtagonistRoute() {
  const { createProfile } = useSelectedChild();

  return (
    <ProtagonistSelectionScreen
      onSubmit={async (input) => {
        await createProfile(input);
        router.dismissTo('/');
      }}
    />
  );
}

import { ProtagonistSelectionScreen } from '@/components/profile/protagonist-selection-screen';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useSelectedChild } from '@/contexts/SelectedChildContext';

export default function OnboardingProtagonistRoute() {
  const { createProfile } = useSelectedChild();
  const { completeOnboarding } = useOnboarding();

  return (
    <ProtagonistSelectionScreen
      onSubmit={async (input) => {
        await createProfile(input);
        await completeOnboarding();
      }}
    />
  );
}

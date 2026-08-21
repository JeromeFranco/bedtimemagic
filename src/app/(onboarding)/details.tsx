import { router } from 'expo-router';

import { ProfileDetailsScreen } from '@/components/profile/profile-details-screen';

export default function OnboardingDetailsRoute() {
  return <ProfileDetailsScreen onContinue={() => router.push('/protagonist')} />;
}

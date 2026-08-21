import { router } from 'expo-router';

import { ProfileDetailsScreen } from '@/components/profile/profile-details-screen';

export default function AddProfileDetailsRoute() {
  return (
    <ProfileDetailsScreen onContinue={() => router.push('/profile/protagonist')} />
  );
}

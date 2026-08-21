import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProfileSheet } from '@/components/profile-sheet';
import { useProfileDraft } from '@/contexts/ProfileDraftContext';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { router } from 'expo-router';
import type { ChildProfile } from '@/types';

const mockSetSelectedProfile = jest.fn();
const mockBegin = jest.fn();
const firstProfile: ChildProfile = {
  id: 'first',
  user_id: 'user-1',
  name: 'Sparky',
  developmental_stage: 'preschool',
  protagonist: 'barnaby',
  created_at: '2026-08-21T00:00:00Z',
};
const secondProfile: ChildProfile = {
  ...firstProfile,
  id: 'second',
  name: 'Rocket',
  developmental_stage: 'older_kids',
  protagonist: 'rex',
};

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));
jest.mock('@/contexts/ProfileDraftContext', () => ({
  useProfileDraft: jest.fn(),
}));
jest.mock('@/contexts/SelectedChildContext', () => ({
  useSelectedChild: jest.fn(),
}));

const mockUseProfileDraft = useProfileDraft as jest.MockedFunction<typeof useProfileDraft>;
const mockUseSelectedChild = useSelectedChild as jest.MockedFunction<typeof useSelectedChild>;

describe('ProfileSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfileDraft.mockReturnValue({ begin: mockBegin } as never);
    mockUseSelectedChild.mockReturnValue({
      profiles: [firstProfile, secondProfile],
      selectedProfile: firstProfile,
      setSelectedProfile: mockSetSelectedProfile,
    } as never);
  });

  it('announces selected state and closes after switching profiles', async () => {
    const onClose = jest.fn();
    const view = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ProfileSheet visible onClose={onClose} />
      </SafeAreaProvider>,
    );

    expect(view.getByRole('radio', { name: 'Sparky, Preschool' }).props.accessibilityState)
      .toEqual({ selected: true });
    await fireEvent.press(view.getByTestId('profile-second'));

    expect(mockSetSelectedProfile).toHaveBeenCalledWith(secondProfile);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes, resets add mode, then opens profile details', async () => {
    const onClose = jest.fn();
    const view = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ProfileSheet visible onClose={onClose} />
      </SafeAreaProvider>,
    );

    await fireEvent.press(view.getByText('Add Profile'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockBegin).toHaveBeenCalledWith('add');
    expect(router.push).toHaveBeenCalledWith('/profile/details');
  });
});

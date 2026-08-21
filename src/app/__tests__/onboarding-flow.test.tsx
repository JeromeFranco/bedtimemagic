import { fireEvent, render } from '@testing-library/react-native';

import WelcomeScreen from '../(onboarding)/index';
import OnboardingProtagonistRoute from '../(onboarding)/protagonist';
import type { ProfileSubmissionInput } from '@/components/profile/protagonist-selection-screen';
import { router } from 'expo-router';

const mockBegin = jest.fn();
const mockCreateProfile = jest.fn();
const mockCompleteOnboarding = jest.fn();
let mockRouteSubmit: ((input: ProfileSubmissionInput) => Promise<void>) | undefined;

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));
jest.mock('@/contexts/ProfileDraftContext', () => ({
  useProfileDraft: () => ({ begin: mockBegin }),
}));
jest.mock('@/contexts/SelectedChildContext', () => ({
  useSelectedChild: () => ({ createProfile: mockCreateProfile }),
}));
jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({ completeOnboarding: mockCompleteOnboarding }),
}));
jest.mock('@/components/profile/protagonist-selection-screen', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    ProtagonistSelectionScreen: ({
      onSubmit,
    }: {
      onSubmit: (input: ProfileSubmissionInput) => Promise<void>;
    }) => {
      mockRouteSubmit = onSubmit;
      return React.createElement(Text, null, 'protagonist route');
    },
  };
});

describe('onboarding routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteSubmit = undefined;
    mockCreateProfile.mockResolvedValue({ id: 'created' });
    mockCompleteOnboarding.mockResolvedValue(undefined);
  });

  it('starts a reset onboarding draft from the parent welcome', async () => {
    const view = await render(<WelcomeScreen />);
    await fireEvent.press(view.getByText('Create Tonight’s Story'));

    expect(mockBegin).toHaveBeenCalledWith('onboarding');
    expect(router.push).toHaveBeenCalledWith('/details');
  });

  it('creates the profile before completing onboarding and does not push Home', async () => {
    const order: string[] = [];
    mockCreateProfile.mockImplementation(async () => {
      order.push('create');
      return { id: 'created' };
    });
    mockCompleteOnboarding.mockImplementation(async () => {
      order.push('complete');
    });
    await render(<OnboardingProtagonistRoute />);
    const input: ProfileSubmissionInput = {
      nickname: 'Rocket',
      developmentalStage: 'preschool',
      protagonist: 'rex',
    };

    await mockRouteSubmit?.(input);

    expect(mockCreateProfile).toHaveBeenCalledWith(input);
    expect(order).toEqual(['create', 'complete']);
    expect(router.push).not.toHaveBeenCalledWith('/');
  });
});

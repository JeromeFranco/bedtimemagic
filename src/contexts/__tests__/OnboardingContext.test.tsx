import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import {
  OnboardingProvider,
  useOnboarding,
} from '@/contexts/OnboardingContext';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import type { ChildProfile } from '@/types';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/contexts/SelectedChildContext', () => ({ useSelectedChild: jest.fn() }));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseSelectedChild = useSelectedChild as jest.MockedFunction<typeof useSelectedChild>;
const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const retryAnonymousSignIn = jest.fn();
const retryLoading = jest.fn();

const existingProfile: ChildProfile = {
  id: 'existing',
  user_id: 'user-1',
  name: 'Sparky',
  developmental_stage: 'preschool',
  protagonist: 'barnaby',
  created_at: '2026-08-21T00:00:00Z',
};

function BootstrapState() {
  const { status, completeOnboarding, retryBootstrap } = useOnboarding();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        if (status === 'authError') retryBootstrap();
        if (status === 'required') void completeOnboarding();
      }}
    >
      <Text>{status}</Text>
    </Pressable>
  );
}

function renderBootstrap() {
  return render(
    <OnboardingProvider>
      <BootstrapState />
    </OnboardingProvider>,
  );
}

describe('OnboardingProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.getItem.mockResolvedValue(null);
    storage.setItem.mockResolvedValue();
    mockUseAuth.mockReturnValue({
      session: null,
      user: { id: 'user-1' } as never,
      isLoading: false,
      error: null,
      retryAnonymousSignIn,
    });
    mockUseSelectedChild.mockReturnValue({
      profiles: [],
      selectedProfile: null,
      isLoading: false,
      error: null,
      setSelectedProfile: jest.fn(),
      createProfile: jest.fn(),
      retryLoading,
    });
  });

  it('keeps the decision loading until bootstrap resolves, then requires onboarding', async () => {
    const pendingStorage = Promise.withResolvers<string | null>();
    storage.getItem.mockReturnValue(pendingStorage.promise);
    const view = await renderBootstrap();

    expect(view.getByText('loading')).toBeTruthy();
    pendingStorage.resolve(null);
    await waitFor(() => expect(view.getByText('required')).toBeTruthy());
  });

  it('migrates an existing profile directly to ready without deleting it', async () => {
    mockUseSelectedChild.mockReturnValue({
      ...mockUseSelectedChild(),
      profiles: [existingProfile],
      selectedProfile: existingProfile,
    });
    const view = await renderBootstrap();

    await waitFor(() => expect(view.getByText('ready')).toBeTruthy());
    expect(storage.setItem).toHaveBeenCalledWith('onboarding_complete_v1', 'user-1');
  });

  it('accepts completion only for the current anonymous user', async () => {
    storage.getItem.mockResolvedValue('user-1');
    const view = await renderBootstrap();

    await waitFor(() => expect(view.getByText('ready')).toBeTruthy());
  });

  it('requires onboarding when a completion record belongs to a lost session', async () => {
    storage.getItem.mockResolvedValue('previous-user');
    const view = await renderBootstrap();

    await waitFor(() => expect(view.getByText('required')).toBeTruthy());
  });

  it('enters ready after completion even when local persistence fails', async () => {
    storage.setItem.mockRejectedValue(new Error('storage full'));
    const view = await renderBootstrap();
    await waitFor(() => expect(view.getByText('required')).toBeTruthy());

    await fireEvent.press(view.getByRole('button'));
    await waitFor(() => expect(view.getByText('ready')).toBeTruthy());
  });

  it('delegates retry when anonymous authentication fails', async () => {
    mockUseAuth.mockReturnValue({
      ...mockUseAuth(),
      user: null,
      error: new Error('offline'),
    });
    const view = await renderBootstrap();

    expect(view.getByText('authError')).toBeTruthy();
    await fireEvent.press(view.getByRole('button'));
    expect(retryAnonymousSignIn).toHaveBeenCalledTimes(1);
  });
});

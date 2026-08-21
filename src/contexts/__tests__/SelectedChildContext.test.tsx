import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

import { createChild, getChildren } from '@/api/children';
import { useAuth } from '@/contexts/AuthContext';
import {
  SelectedChildProvider,
  useSelectedChild,
} from '@/contexts/SelectedChildContext';
import type { ChildProfile } from '@/types';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/api/children', () => ({
  getChildren: jest.fn(),
  createChild: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetChildren = getChildren as jest.MockedFunction<typeof getChildren>;
const mockCreateChild = createChild as jest.MockedFunction<typeof createChild>;
const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const firstProfile: ChildProfile = {
  id: 'first',
  user_id: 'user-1',
  name: 'Sparky',
  developmental_stage: 'preschool',
  protagonist: 'barnaby',
  created_at: '2026-08-21T00:00:00Z',
};

function ProfileState() {
  const { profiles, selectedProfile, isLoading, error, createProfile } =
    useSelectedChild();
  if (isLoading) return <Text>loading</Text>;
  if (error) return <Text>error</Text>;
  return (
    <View>
      <Text>{profiles.map((profile) => profile.name).join(',') || 'empty'}</Text>
      <Text>{selectedProfile?.id ?? 'none'}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void createProfile({
          nickname: 'Nova',
          developmentalStage: 'early_primary',
          protagonist: 'nova',
        })}
      >
        <Text>create</Text>
      </Pressable>
    </View>
  );
}

describe('SelectedChildProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      session: null,
      user: { id: 'user-1' } as never,
      isLoading: false,
      error: null,
      retryAnonymousSignIn: jest.fn(),
    });
    storage.getItem.mockResolvedValue(null);
    storage.setItem.mockResolvedValue();
  });

  it('waits for profiles and selects a valid fallback profile', async () => {
    const pendingProfiles = Promise.withResolvers<ChildProfile[]>();
    mockGetChildren.mockReturnValue(pendingProfiles.promise);

    const view = await render(
      <SelectedChildProvider>
        <ProfileState />
      </SelectedChildProvider>,
    );
    expect(view.getByText('loading')).toBeTruthy();

    await act(async () => pendingProfiles.resolve([firstProfile]));
    await waitFor(() => expect(view.getByText('Sparky')).toBeTruthy());
    expect(view.getByText('first')).toBeTruthy();
  });

  it('appends and selects a remotely created profile once despite storage failure', async () => {
    const created: ChildProfile = {
      ...firstProfile,
      id: 'created',
      name: 'Nova',
      protagonist: 'nova',
    };
    mockGetChildren.mockResolvedValue([]);
    mockCreateChild.mockResolvedValue(created);
    storage.setItem.mockRejectedValue(new Error('storage full'));

    const view = await render(
      <SelectedChildProvider>
        <ProfileState />
      </SelectedChildProvider>,
    );
    await waitFor(() => expect(view.getByText('empty')).toBeTruthy());

    await fireEvent.press(view.getByRole('button', { name: 'create' }));
    await waitFor(() => expect(view.getByText('Nova')).toBeTruthy());
    expect(view.getByText('created')).toBeTruthy();
    expect(mockCreateChild).toHaveBeenCalledTimes(1);
  });
});

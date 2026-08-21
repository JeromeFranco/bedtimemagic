import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInAnonymously: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

function AuthState() {
  const { user, isLoading, error, retryAnonymousSignIn } = useAuth();
  if (isLoading) return <Text>loading</Text>;
  if (error) {
    return (
      <Pressable accessibilityRole="button" onPress={retryAnonymousSignIn}>
        <Text>retry</Text>
      </Pressable>
    );
  }
  return <Text>{user?.id ?? 'none'}</Text>;
}

const auth = supabase.auth as jest.Mocked<typeof supabase.auth>;

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  it('makes anonymous sign-in failure retryable exactly once per action', async () => {
    const user = { id: 'anonymous-user' };
    auth.signInAnonymously
      .mockResolvedValueOnce({
        data: { session: null, user: null },
        error: new Error('offline') as never,
      })
      .mockResolvedValueOnce({
        data: { session: { user } as never, user: user as never },
        error: null,
      });

    const view = await render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );

    await waitFor(() => expect(view.getByText('retry')).toBeTruthy());
    expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByRole('button', { name: 'retry' }));
    await waitFor(() => expect(view.getByText('anonymous-user')).toBeTruthy());
    expect(auth.signInAnonymously).toHaveBeenCalledTimes(2);
  });
  it('establishes a replacement anonymous session after session loss', async () => {
    const firstUser = { id: 'first-user' };
    const replacementUser = { id: 'replacement-user' };
    auth.signInAnonymously
      .mockResolvedValueOnce({
        data: { session: { user: firstUser } as never, user: firstUser as never },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          session: { user: replacementUser } as never,
          user: replacementUser as never,
        },
        error: null,
      });

    const view = await render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );
    await waitFor(() => expect(view.getByText('first-user')).toBeTruthy());

    const authStateListener = auth.onAuthStateChange.mock.calls[0][0];
    await act(async () => {
      await authStateListener('SIGNED_OUT', null);
    });

    await waitFor(() => expect(view.getByText('replacement-user')).toBeTruthy());
    expect(auth.signInAnonymously).toHaveBeenCalledTimes(2);
  });

});

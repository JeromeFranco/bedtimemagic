import { fireEvent, render } from '@testing-library/react-native';

import RootLayout from '../_layout';

let mockOnboardingStatus: 'loading' | 'authError' | 'required' | 'ready' = 'loading';
const mockRetryBootstrap = jest.fn();

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const Stack = ({ children }: { children: React.ReactNode }) => children;
  Stack.Screen = function StackScreen({ name }: { name: string }) {
    return React.createElement(Text, null, name);
  };
  Stack.Protected = function ProtectedStack({
    children,
    guard,
  }: {
    children: React.ReactNode;
    guard: boolean;
  }) {
    return guard ? children : null;
  };
  return {
    DarkTheme: {},
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    Stack,
  };
});
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/lib/query-client', () => ({ queryClient: {} }));
jest.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/contexts/SelectedChildContext', () => ({
  SelectedChildProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/contexts/OnboardingContext', () => ({
  OnboardingProvider: ({ children }: { children: React.ReactNode }) => children,
  useOnboarding: () => ({
    status: mockOnboardingStatus,
    error: null,
    completeOnboarding: jest.fn(),
    retryBootstrap: mockRetryBootstrap,
  }),
}));
jest.mock('@/contexts/ProfileDraftContext', () => ({
  ProfileDraftProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/contexts/StoryGenerationContext', () => ({
  StoryGenerationProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/contexts/PlayerContext', () => ({
  PlayerProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnboardingStatus = 'loading';
  });

  it('renders no navigator while bootstrap is loading', async () => {
    const view = await render(<RootLayout />);
    expect(view.queryByText('(onboarding)')).toBeNull();
    expect(view.queryByText('(app)')).toBeNull();
  });

  it('registers only the protected group matching bootstrap state', async () => {
    mockOnboardingStatus = 'required';
    const view = await render(<RootLayout />);
    expect(view.getByText('(onboarding)')).toBeTruthy();
    expect(view.queryByText('(app)')).toBeNull();

    mockOnboardingStatus = 'ready';
    await view.rerender(<RootLayout />);
    expect(view.queryByText('(onboarding)')).toBeNull();
    expect(view.getByText('(app)')).toBeTruthy();
  });

  it('renders a retry action for bootstrap failure', async () => {
    mockOnboardingStatus = 'authError';
    const view = await render(<RootLayout />);
    await fireEvent.press(view.getByText('Try Again'));
    expect(mockRetryBootstrap).toHaveBeenCalledTimes(1);
  });
});

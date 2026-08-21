import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RefreshControlProps } from 'react-native';

import VaultScreen from '../(app)/(index,vault)/vault';
import { router } from 'expo-router';
import { useStories } from '@/hooks/use-story';
import type { Story } from '@/types';

const mockReact = React;

jest.mock('react-native/Libraries/Components/RefreshControl/RefreshControl', () => {
  return {
    __esModule: true,
    default: (props: RefreshControlProps) => (
      mockReact.createElement('RCTRefreshControl', { ...props, testID: 'vault-refresh-control' })
    ),
  };
});

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/hooks/use-story', () => ({
  useStories: jest.fn(),
}));

jest.mock('@/lib/audio-cache', () => ({
  getCachedCoverPath: jest.fn(() => Promise.resolve(null)),
}));

const mockPush = jest.mocked(router.push);
const mockUseStories = jest.mocked(useStories);
const mockRefetch = jest.fn();

const STORIES: Story[] = [
  {
    id: 'story-1',
    user_id: 'user-1',
    child_id: 'child-1',
    title: 'Mia and the Moonlight Garden',
    story_text: 'Once upon a time...',
    moral: 'Kindness helps friendships grow.',
    pillow_talk_prompt: 'What made Mia brave?',
    sleepy_affirmation: 'I am kind and brave.',
    cover_image_url: null,
    challenge: 'refusing_teeth',
    protagonist: 'barnaby',
    created_at: '2026-08-14T00:00:00Z',
  },
];

function mockStories(overrides: Record<string, unknown> = {}) {
  mockUseStories.mockReturnValue({
    data: STORIES,
    isError: false,
    isPending: false,
    isRefetching: false,
    refetch: mockRefetch,
    ...overrides,
  } as never);
}

function renderVault() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <VaultScreen />
    </SafeAreaProvider>,
  );
}

describe('VaultScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStories();
  });

  it('shows the approved header and opens a selected story', async () => {
    const view = await renderVault();

    expect(view.getByText('Your stories')).toBeTruthy();
    expect(view.getByText('Stories you’ve made together.')).toBeTruthy();
    expect(view.getByText(STORIES[0].title)).toBeTruthy();

    fireEvent.press(view.getByText(STORIES[0].title));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/story', params: { id: STORIES[0].id } });
  });

  it('retains the header while initially loading', async () => {
    mockStories({ data: undefined, isPending: true });
    const view = await renderVault();

    expect(view.getByText('Your stories')).toBeTruthy();
    expect(view.getByText('Loading stories…')).toBeTruthy();
  });

  it('uses automatic iOS scroll-content inset adjustment', async () => {
    const view = await renderVault();
    const scrollView = view.root?.queryAll(
      (node) => node.props.contentInsetAdjustmentBehavior === 'automatic',
    )[0];

    expect(scrollView).toBeTruthy();
  });

  it('adds a non-interactive screen-owned status-bar scrim', async () => {
    const view = await renderVault();

    expect(view.getByTestId('status-bar-scrim').props.pointerEvents).toBe('none');
  });

  it('guides an empty Vault back to story creation', async () => {
    mockStories({ data: [] });
    const view = await renderVault();

    expect(view.getByText('Create your first story')).toBeTruthy();
    expect(view.getByText('It’ll be here whenever you’re ready to listen again.')).toBeTruthy();
    expect(view.queryByText('📚')).toBeNull();

    fireEvent.press(view.getByText('Create a story'));
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('retries an empty failed request', async () => {
    mockStories({ data: undefined, isError: true });
    const view = await renderVault();

    expect(view.getByText('Your stories')).toBeTruthy();
    fireEvent.press(view.getByText('Try again'));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('keeps populated stories visible and refreshes them with pull to refresh', async () => {
    mockStories({ isRefetching: true });
    const view = await renderVault();
    const refreshControl = view.getByTestId('vault-refresh-control');

    expect(view.getByText(STORIES[0].title)).toBeTruthy();
    expect(refreshControl.props.refreshing).toBe(true);

    refreshControl.props.onRefresh();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});

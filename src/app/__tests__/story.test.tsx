import { render, fireEvent } from '@testing-library/react-native';

jest.mock('expo-router', () => {
  const mockPush = jest.fn();
  return {
    __esModule: true,
    useLocalSearchParams: jest.fn(),
    router: { back: jest.fn(), push: mockPush },
    _mockPush: mockPush,
  };
});

jest.mock('expo-glass-effect', () => {
  const React = require('react');
  return {
    GlassView: ({ children, ...props }: any) => React.createElement('GlassView', props, children),
  };
});

jest.mock('@/hooks/use-story', () => ({
  useStory: jest.fn(),
}));

jest.mock('@/hooks/use-cover-image', () => ({
  useCoverImage: jest.fn(() => ({ coverUrl: null, isLoading: false, error: null })),
}));

jest.mock('@/lib/audio-cache', () => ({
  getCachedCoverPath: jest.fn(() => Promise.resolve(null)),
  cacheCoverImage: jest.fn(() => Promise.resolve('/cached/path')),
}));

jest.mock('@/lib/audio-utils', () => ({
  preFetchAudio: jest.fn(() => Promise.resolve()),
}));

import StoryScreen from '../(index,explore)/story';
import { useLocalSearchParams } from 'expo-router';
import { useStory } from '@/hooks/use-story';
import { useCoverImage } from '@/hooks/use-cover-image';

const { _mockPush: mockPush } = require('expo-router') as any;

const MOCK_STORY = {
  id: 'story-1',
  user_id: 'user-1',
  child_id: 'child-1',
  title: 'The Toothbrush Adventure',
  story_text: 'Once upon a time...',
  moral: 'Brushing teeth keeps your smile bright.',
  pillow_talk_prompt: 'What was your favorite part?',
  sleepy_affirmation: 'I am brave and kind.',
  cover_image_url: 'https://example.com/cover.png',
  challenge: 'refusing_teeth' as const,
  protagonist: 'barnaby' as const,
  created_at: '2026-06-20T00:00:00Z',
};

describe('StoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'story-1' });
    (useStory as jest.Mock).mockReturnValue({
      data: MOCK_STORY,
      isLoading: false,
      error: null,
    });
    (useCoverImage as jest.Mock).mockReturnValue({
      coverUrl: MOCK_STORY.cover_image_url,
      isLoading: false,
      error: null,
    });
  });

  it('renders story title', async () => {
    const { getByText } = await render(<StoryScreen />);
    expect(getByText('The Toothbrush Adventure')).toBeTruthy();
  });

  it('renders moral summary', async () => {
    const { getByText } = await render(<StoryScreen />);
    expect(getByText('Brushing teeth keeps your smile bright.')).toBeTruthy();
  });

  it('renders protagonist name and emoji', async () => {
    const { getByText } = await render(<StoryScreen />);
    expect(getByText(/Barnaby/)).toBeTruthy();
  });

  it('renders Play Story button', async () => {
    const { getByText } = await render(<StoryScreen />);
    expect(getByText('Play Story')).toBeTruthy();
  });

  it('navigates to /player with story id when Play is tapped', async () => {
    const { getByText } = await render(<StoryScreen />);
    fireEvent.press(getByText('Play Story'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/player',
      params: { id: 'story-1' },
    });
  });

  it('shows placeholder when cover_image_url is null', async () => {
    (useStory as jest.Mock).mockReturnValue({
      data: { ...MOCK_STORY, cover_image_url: null },
      isLoading: false,
      error: null,
    });
    (useCoverImage as jest.Mock).mockReturnValue({
      coverUrl: null,
      isLoading: false,
      error: null,
    });
    const { getByText } = await render(<StoryScreen />);
    expect(getByText('Cover art is being painted...')).toBeTruthy();
  });

  it('shows loading state', async () => {
    (useStory as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    const { getByText } = await render(<StoryScreen />);
    expect(getByText('Loading story...')).toBeTruthy();
  });

  it('shows error state when fetch fails', async () => {
    (useStory as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('fetch failed'),
    });
    const { getByText } = await render(<StoryScreen />);
    expect(getByText('Failed to load story')).toBeTruthy();
    expect(getByText('Go Back')).toBeTruthy();
  });
});

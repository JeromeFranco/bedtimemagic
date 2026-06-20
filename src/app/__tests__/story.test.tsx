import { render, fireEvent } from '@testing-library/react-native';

const mockPlayStory = jest.fn();
jest.mock('@/contexts/PlayerContext', () => ({
  usePlayer: () => ({ playStory: mockPlayStory }),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  router: { back: jest.fn() },
}));

jest.mock('expo-glass-effect', () => {
  const React = require('react');
  return {
    GlassView: ({ children, ...props }: any) => React.createElement('GlassView', props, children),
  };
});

import StoryScreen from '../story';
import { useLocalSearchParams } from 'expo-router';

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
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      story: JSON.stringify(MOCK_STORY),
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

  it('calls playStory when Play is tapped', async () => {
    const { getByText } = await render(<StoryScreen />);
    fireEvent.press(getByText('Play Story'));
    expect(mockPlayStory).toHaveBeenCalledWith(MOCK_STORY);
  });

  it('shows placeholder when cover_image_url is null', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      story: JSON.stringify({ ...MOCK_STORY, cover_image_url: null }),
    });
    const { getByText } = await render(<StoryScreen />);
    expect(getByText('Cover art is being painted...')).toBeTruthy();
  });

  it('shows error state when no story param', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    const { getByText } = await render(<StoryScreen />);
    expect(getByText('No story data')).toBeTruthy();
  });
});

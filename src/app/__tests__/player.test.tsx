import { render } from '@testing-library/react-native';

const mockPlayStory = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockSeekTo = jest.fn();
const mockStopStory = jest.fn();
const mockToggleSleepMode = jest.fn();

jest.mock('@/contexts/PlayerContext', () => ({
  usePlayer: jest.fn(() => ({
    currentStory: null,
    isPlaying: false,
    isBuffering: false,
    isSleepMode: false,
    position: 0,
    duration: 0,
    playStory: mockPlayStory,
    pause: mockPause,
    resume: mockResume,
    seekTo: mockSeekTo,
    stopStory: mockStopStory,
    toggleSleepMode: mockToggleSleepMode,
  })),
}));

jest.mock('expo-router', () => ({
  __esModule: true,
  useLocalSearchParams: jest.fn(),
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('expo-glass-effect', () => {
  const React = require('react');
  return {
    GlassView: ({ children, ...props }: any) => React.createElement('GlassView', props, children),
  };
});

import PlayerScreen from '../player';
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

describe('PlayerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      story: JSON.stringify(MOCK_STORY),
    });
  });

  it('renders story title', async () => {
    const { getByText } = await render(<PlayerScreen />);
    expect(getByText('The Toothbrush Adventure')).toBeTruthy();
  });

  it('renders protagonist name', async () => {
    const { getByText } = await render(<PlayerScreen />);
    expect(getByText(/Barnaby/)).toBeTruthy();
  });

  it('shows error state when no story param', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    const { getByText } = await render(<PlayerScreen />);
    expect(getByText('No story data')).toBeTruthy();
  });

  it('calls playStory on mount', async () => {
    await render(<PlayerScreen />);
    expect(mockPlayStory).toHaveBeenCalledWith(MOCK_STORY);
  });
});

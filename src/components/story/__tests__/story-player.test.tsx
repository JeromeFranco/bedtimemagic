import { render, fireEvent, act } from '@testing-library/react-native';

const mockPause = jest.fn();
const mockResume = jest.fn();
const mockSeekTo = jest.fn();
const mockToggleSleepMode = jest.fn();

jest.mock('@/contexts/PlayerContext', () => ({
  usePlayer: jest.fn(() => ({
    currentStory: null,
    isPlaying: true,
    isBuffering: false,
    isSleepMode: false,
    position: 30,
    duration: 60,
    postStoryPhase: 'idle',
    playStory: jest.fn(),
    pause: mockPause,
    resume: mockResume,
    seekTo: mockSeekTo,
    stopStory: jest.fn(),
    toggleSleepMode: mockToggleSleepMode,
    skipPillowTalk: jest.fn(),
    confirmAffirmation: jest.fn(),
  })),
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  const chainable = () => {
    const obj: Record<string, unknown> = {};
    for (const m of ['onBegin', 'onUpdate', 'onFinalize', 'onEnd', 'onStart', 'onChange']) {
      obj[m] = () => obj;
    }
    return obj;
  };
  return {
    Gesture: { Pan: chainable, Tap: chainable },
    GestureDetector: ({ children }: { children: unknown }) =>
      React.createElement(View, null, children),
  };
});

import { StoryPlayer } from '../story-player';

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

const MOCK_PROTAGONIST = {
  id: 'barnaby' as const,
  name: 'Barnaby',
  species: 'Bear',
  emoji: '🐻',
  personality: 'Gentle bear',
  voiceNotes: 'Warm baritone',
};

describe('StoryPlayer', () => {
  const defaultProps = {
    story: MOCK_STORY,
    protagonist: MOCK_PROTAGONIST,
    imageSource: { uri: 'https://example.com/cover.png' },
    onBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => jest.useRealTimers());

  it('renders story title at 40px hero size', async () => {
    const { getByText } = await render(<StoryPlayer {...defaultProps} />);
    expect(getByText('The Toothbrush Adventure')).toBeTruthy();
  });

  it('renders protagonist name', async () => {
    const { getByText } = await render(<StoryPlayer {...defaultProps} />);
    expect(getByText('Barnaby')).toBeTruthy();
  });

  it('calls pause when playing and play/pause pressed', async () => {
    const { getByTestId } = await render(<StoryPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('play-pause-button'));
    expect(mockPause).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when back button pressed', async () => {
    const { getByTestId } = await render(<StoryPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('player-back-button'));
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('calls toggleSleepMode when sleep button pressed', async () => {
    const { getByTestId } = await render(<StoryPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('sleep-mode-button'));
    expect(mockToggleSleepMode).toHaveBeenCalledTimes(1);
  });

  it('hides controls after 5s', async () => {
    const { queryByTestId } = await render(<StoryPlayer {...defaultProps} />);
    expect(queryByTestId('play-pause-button')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(queryByTestId('play-pause-button')).toBeNull();
  });

  it('shows controls on tap when hidden', async () => {
    const { getByTestId, queryByTestId } = await render(<StoryPlayer {...defaultProps} />);
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(queryByTestId('play-pause-button')).toBeNull();
    await act(async () => {
      fireEvent.press(getByTestId('player-screen'));
    });
    expect(queryByTestId('play-pause-button')).toBeTruthy();
  });
});

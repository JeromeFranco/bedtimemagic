import { render, fireEvent, act, cleanup } from '@testing-library/react-native';

const mockPlayStory = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockSeekTo = jest.fn();
const mockToggleSleepMode = jest.fn();

jest.mock('@/contexts/PlayerContext', () => ({
  usePlayer: jest.fn(() => ({
    currentStory: null,
    isPlaying: false,
    isBuffering: false,
    isSleepMode: false,
    position: 0,
    duration: 60,
    postStoryPhase: 'idle',
    playStory: mockPlayStory,
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
import { usePlayer } from '@/contexts/PlayerContext';

const mockUsePlayer = usePlayer as jest.Mock;

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
    mockUsePlayer.mockReturnValue({
      currentStory: null,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 60,
      postStoryPhase: 'idle',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: jest.fn(),
      toggleSleepMode: mockToggleSleepMode,
      skipPillowTalk: jest.fn(),
      confirmAffirmation: jest.fn(),
    });
  });

  afterEach(async () => {
    await act(async () => {});
    cleanup();
  });

  it('renders story title and moral', async () => {
    const { getByText } = await render(<StoryPlayer {...defaultProps} />);
    expect(getByText('The Toothbrush Adventure', { exact: false })).toBeTruthy();
    expect(getByText('Brushing teeth keeps your smile bright.', { exact: false })).toBeTruthy();
  });

  it('renders protagonist name', async () => {
    const { getByText } = await render(<StoryPlayer {...defaultProps} />);
    expect(getByText('Barnaby', { exact: false })).toBeTruthy();
  });

  it('calls playStory when Play is pressed while not playing', async () => {
    const { getByTestId } = await render(<StoryPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('play-pause-button'));
    expect(mockPlayStory).toHaveBeenCalledWith(MOCK_STORY);
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

  it('calls pause when Play is pressed while playing', async () => {
    mockUsePlayer.mockReturnValue({
      currentStory: MOCK_STORY,
      isPlaying: true,
      isBuffering: false,
      isSleepMode: false,
      position: 30,
      duration: 60,
      postStoryPhase: 'idle',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: jest.fn(),
      toggleSleepMode: mockToggleSleepMode,
    });
    const { getByTestId } = await render(<StoryPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('play-pause-button'));
    expect(mockPause).toHaveBeenCalledTimes(1);
  });

  it('calls seekTo when -15s or +15s buttons are pressed', async () => {
    mockUsePlayer.mockReturnValue({
      currentStory: MOCK_STORY,
      isPlaying: true,
      isBuffering: false,
      isSleepMode: false,
      position: 30,
      duration: 60,
      postStoryPhase: 'idle',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: jest.fn(),
      toggleSleepMode: mockToggleSleepMode,
    });
    const { getByTestId } = await render(<StoryPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('seek-backward-button'));
    expect(mockSeekTo).toHaveBeenCalledWith(15);

    fireEvent.press(getByTestId('seek-forward-button'));
    expect(mockSeekTo).toHaveBeenCalledWith(45);
  });
});




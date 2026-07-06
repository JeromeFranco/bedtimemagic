import { render, fireEvent, act } from '@testing-library/react-native';

const mockPlayStory = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockSeekTo = jest.fn();
const mockStopStory = jest.fn();
const mockToggleSleepMode = jest.fn();
const mockSkipPillowTalk = jest.fn();
const mockConfirmAffirmation = jest.fn();

jest.mock('@/contexts/PlayerContext', () => ({
  usePlayer: jest.fn(() => ({
    currentStory: null,
    isPlaying: false,
    isBuffering: false,
    isSleepMode: false,
    position: 0,
    duration: 0,
    postStoryPhase: 'idle',
    playStory: mockPlayStory,
    pause: mockPause,
    resume: mockResume,
    seekTo: mockSeekTo,
    stopStory: mockStopStory,
    toggleSleepMode: mockToggleSleepMode,
    skipPillowTalk: mockSkipPillowTalk,
    confirmAffirmation: mockConfirmAffirmation,
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

jest.mock('@/hooks/use-story', () => ({
  useStory: jest.fn(),
}));

import PlayerScreen from '../player';
import { useLocalSearchParams } from 'expo-router';
import { useStory } from '@/hooks/use-story';

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
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'story-1' });
    (useStory as jest.Mock).mockReturnValue({ data: MOCK_STORY, isLoading: false, error: null });
  });

  it('renders story title', async () => {
    const { getByText } = await render(<PlayerScreen />);
    expect(getByText('The Toothbrush Adventure')).toBeTruthy();
  });

  it('renders protagonist name', async () => {
    const { getByText } = await render(<PlayerScreen />);
    expect(getByText(/Barnaby/)).toBeTruthy();
  });

  it('shows error state when story fetch fails', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'bad-id' });
    (useStory as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, error: new Error('not found') });
    const { getByText } = await render(<PlayerScreen />);
    expect(getByText('Could not load story')).toBeTruthy();
  });

  it('calls playStory on mount', async () => {
    await render(<PlayerScreen />);
    expect(mockPlayStory).toHaveBeenCalledWith(MOCK_STORY);
  });
});

describe('post-story bridge', () => {
  const { usePlayer } = require('@/contexts/PlayerContext');

  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'story-1' });
    (useStory as jest.Mock).mockReturnValue({ data: MOCK_STORY, isLoading: false, error: null });
  });

  it('renders pillow talk prompt when phase is pillow_talk', async () => {
    usePlayer.mockReturnValue({
      currentStory: null,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'pillow_talk',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: mockStopStory,
      toggleSleepMode: mockToggleSleepMode,
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });

    const { getByText } = await render(<PlayerScreen />);
    expect(getByText('What was your favorite part?')).toBeTruthy();
  });

  it('renders brightness ramp container during pillow_talk', async () => {
    usePlayer.mockReturnValue({
      currentStory: null,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'pillow_talk',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: mockStopStory,
      toggleSleepMode: mockToggleSleepMode,
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });

    const { getByText } = await render(<PlayerScreen />);
    expect(getByText('What was your favorite part?')).toBeTruthy();
    expect(getByText('Next')).toBeTruthy();
    expect(getByText('Skip for tonight')).toBeTruthy();
  });

  it('renders Next and Skip buttons during pillow_talk', async () => {
    usePlayer.mockReturnValue({
      currentStory: null,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'pillow_talk',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: mockStopStory,
      toggleSleepMode: mockToggleSleepMode,
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });

    const { getByText } = await render(<PlayerScreen />);
    expect(getByText('Next')).toBeTruthy();
    expect(getByText('Skip for tonight')).toBeTruthy();
  });

  it('calls skipPillowTalk when Next is pressed', async () => {
    usePlayer.mockReturnValue({
      currentStory: null,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'pillow_talk',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: mockStopStory,
      toggleSleepMode: mockToggleSleepMode,
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });

    const { getByText } = await render(<PlayerScreen />);
    fireEvent.press(getByText('Next'));
    expect(mockSkipPillowTalk).toHaveBeenCalled();
  });

  it('calls skipPillowTalk when Skip for tonight is pressed', async () => {
    usePlayer.mockReturnValue({
      currentStory: null,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'pillow_talk',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: mockStopStory,
      toggleSleepMode: mockToggleSleepMode,
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });

    const { getByText } = await render(<PlayerScreen />);
    fireEvent.press(getByText('Skip for tonight'));
    expect(mockSkipPillowTalk).toHaveBeenCalled();
  });

  it('renders affirmation text when phase is affirmation', async () => {
    usePlayer.mockReturnValue({
      currentStory: null,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'affirmation',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: mockStopStory,
      toggleSleepMode: mockToggleSleepMode,
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });

    const { getByText } = await render(<PlayerScreen />);
    expect(getByText('I am brave and kind.')).toBeTruthy();
  });

  it('renders Goodnight button during affirmation', async () => {
    usePlayer.mockReturnValue({
      currentStory: null,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'affirmation',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: mockStopStory,
      toggleSleepMode: mockToggleSleepMode,
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });

    const { getByText } = await render(<PlayerScreen />);
    expect(getByText('Goodnight')).toBeTruthy();
  });

  it('calls confirmAffirmation when Goodnight is pressed', async () => {
    usePlayer.mockReturnValue({
      currentStory: null,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'affirmation',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: mockStopStory,
      toggleSleepMode: mockToggleSleepMode,
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });

    const { getByText } = await render(<PlayerScreen />);
    fireEvent.press(getByText('Goodnight'));
    expect(mockConfirmAffirmation).toHaveBeenCalled();
  });

  it('calls router.back when phase is done', async () => {
    const { router } = require('expo-router');
    usePlayer.mockReturnValue({
      currentStory: null,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'done',
      playStory: mockPlayStory,
      pause: mockPause,
      resume: mockResume,
      seekTo: mockSeekTo,
      stopStory: mockStopStory,
      toggleSleepMode: mockToggleSleepMode,
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });

    await render(<PlayerScreen />);
    expect(router.back).toHaveBeenCalled();
  });
});

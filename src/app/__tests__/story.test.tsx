import { render, fireEvent, act } from '@testing-library/react-native';

const mockPlayStory = jest.fn();
const mockStopStory = jest.fn();
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
    pause: jest.fn(),
    resume: jest.fn(),
    seekTo: jest.fn(),
    stopStory: mockStopStory,
    toggleSleepMode: jest.fn(),
    skipPillowTalk: mockSkipPillowTalk,
    confirmAffirmation: mockConfirmAffirmation,
  })),
}));

jest.mock('expo-router', () => ({
  __esModule: true,
  useLocalSearchParams: jest.fn(),
  router: { back: jest.fn() },
}));

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
  prefetchStoryAudio: jest.fn(() => Promise.resolve()),
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

import StoryScreen from '../(index,explore)/story';
import { useLocalSearchParams, router } from 'expo-router';
import { useStory } from '@/hooks/use-story';
import { useCoverImage } from '@/hooks/use-cover-image';

const { usePlayer } = require('@/contexts/PlayerContext');

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
    (useStory as jest.Mock).mockReturnValue({ data: MOCK_STORY, isLoading: false, error: null });
    (useCoverImage as jest.Mock).mockReturnValue({ coverUrl: 'https://example.com/cover.png', isLoading: false, error: null });
  });

  it('renders spotify player layout directly with title and play button', async () => {
    const { getByText, getByTestId } = await render(<StoryScreen />);
    expect(getByText('The Toothbrush Adventure')).toBeTruthy();
    expect(getByTestId('play-pause-button')).toBeTruthy();
  });

  it('calls playStory when play button is pressed', async () => {
    const { getByTestId } = await render(<StoryScreen />);
    await act(async () => {
      fireEvent.press(getByTestId('play-pause-button'));
    });
    expect(mockPlayStory).toHaveBeenCalledWith(MOCK_STORY);
  });

  it('shows loading state', async () => {
    (useStory as jest.Mock).mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { getByText } = await render(<StoryScreen />);
    expect(getByText('Loading story...')).toBeTruthy();
  });

  it('shows error state with Go Back', async () => {
    (useStory as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, error: new Error('fail') });
    const { getByText } = await render(<StoryScreen />);
    expect(getByText("Couldn't load this story")).toBeTruthy();
    fireEvent.press(getByText('Go Back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('renders pillow talk when postStoryPhase is pillow_talk', async () => {
    usePlayer.mockReturnValue({
      currentStory: MOCK_STORY,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'pillow_talk',
      playStory: mockPlayStory,
      pause: jest.fn(),
      resume: jest.fn(),
      seekTo: jest.fn(),
      stopStory: mockStopStory,
      toggleSleepMode: jest.fn(),
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });
    const { getByText } = await render(<StoryScreen />);
    expect(getByText('What was your favorite part?')).toBeTruthy();
  });

  it('renders affirmation when postStoryPhase is affirmation', async () => {
    usePlayer.mockReturnValue({
      currentStory: MOCK_STORY,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'affirmation',
      playStory: mockPlayStory,
      pause: jest.fn(),
      resume: jest.fn(),
      seekTo: jest.fn(),
      stopStory: mockStopStory,
      toggleSleepMode: jest.fn(),
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });
    const { getByText } = await render(<StoryScreen />);
    expect(getByText('I am brave and kind.')).toBeTruthy();
  });

  it('navigates back when postStoryPhase is done', async () => {
    usePlayer.mockReturnValue({
      currentStory: null,
      isPlaying: false,
      isBuffering: false,
      isSleepMode: false,
      position: 0,
      duration: 0,
      postStoryPhase: 'done',
      playStory: mockPlayStory,
      pause: jest.fn(),
      resume: jest.fn(),
      seekTo: jest.fn(),
      stopStory: mockStopStory,
      toggleSleepMode: jest.fn(),
      skipPillowTalk: mockSkipPillowTalk,
      confirmAffirmation: mockConfirmAffirmation,
    });
    await render(<StoryScreen />);
    expect(router.back).toHaveBeenCalled();
  });

  it('calls stopStory on unmount', async () => {
    const { unmount } = await render(<StoryScreen />);
    await unmount();
    expect(mockStopStory).toHaveBeenCalled();
  });

  it('prefetches story audio on mount', async () => {
    const { prefetchStoryAudio } = require('@/lib/audio-utils');
    await render(<StoryScreen />);
    expect(prefetchStoryAudio).toHaveBeenCalledWith('story-1', 'Once upon a time...');
  });
});

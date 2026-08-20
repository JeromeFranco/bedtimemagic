import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockPlayStory = jest.fn();
const mockStopStory = jest.fn();
const mockFinishWindDown = jest.fn();
const mockCompleteWindDown = jest.fn();
const mockToggleSleepMode = jest.fn();
const mockNavigation: { addListener: jest.Mock } = { addListener: jest.fn(() => jest.fn()) };

jest.mock('@/contexts/PlayerContext', () => ({
  usePlayer: jest.fn(),
}));

jest.mock('expo-router', () => ({
  __esModule: true,
  useLocalSearchParams: jest.fn(),
  useNavigation: jest.fn(),
  router: { back: jest.fn() },
  Stack: { Screen: jest.fn(() => null) },
}));

jest.mock('@/hooks/use-story', () => ({ useStory: jest.fn() }));
jest.mock('@/hooks/use-cover-image', () => ({
  useCoverImage: jest.fn(() => ({ coverUrl: null, isLoading: false, error: null })),
}));
jest.mock('@/lib/audio-cache', () => ({
  getCachedCoverPath: jest.fn(() => Promise.resolve(null)),
  cacheCoverImage: jest.fn(() => Promise.resolve('/cached/path')),
}));
jest.mock('@/lib/audio-utils', () => ({ prefetchStoryAudio: jest.fn(() => Promise.resolve()) }));

import StoryScreen from '../(index,vault)/story';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useStory } from '@/hooks/use-story';
import { useCoverImage } from '@/hooks/use-cover-image';
import { usePlayer } from '@/contexts/PlayerContext';

const mockUsePlayer = usePlayer as jest.Mock;
const mockStackScreen = (jest.requireMock('expo-router') as {
  Stack: { Screen: jest.Mock };
}).Stack.Screen;

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

const basePlayerMock = (overrides = {}) => ({
  currentStory: null,
  isPlaying: false,
  isBuffering: false,
  isSleepMode: false,
  playbackError: null,
  position: 0,
  duration: 0,
  postStoryPhase: 'idle' as const,
  playStory: mockPlayStory,
  pause: jest.fn(),
  resume: jest.fn(),
  seekTo: jest.fn(),
  stopStory: mockStopStory,
  toggleSleepMode: mockToggleSleepMode,
  showAffirmation: jest.fn(),
  finishWindDown: mockFinishWindDown,
  completeWindDown: mockCompleteWindDown,
  ...overrides,
});

function renderStory() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <StoryScreen />
    </SafeAreaProvider>,
  );
}

describe('StoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'story-1' });
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useStory as jest.Mock).mockReturnValue({ data: MOCK_STORY, isLoading: false, error: null });
    (useCoverImage as jest.Mock).mockReturnValue({
      coverUrl: 'https://example.com/cover.png',
      isLoading: false,
      error: null,
    });
    mockUsePlayer.mockImplementation(() => basePlayerMock());
  });

  it('renders the integrated player surface for Pillow Talk', async () => {
    mockUsePlayer.mockImplementation(() => basePlayerMock({ postStoryPhase: 'pillow_talk' }));
    const queries = await renderStory();
    expect(queries.getByTestId('artwork-image')).toBeTruthy();
    expect(queries.queryByTestId('player-back-button')).toBeNull();
    expect(queries.getByText('Pillow talk')).toBeTruthy();
    expect(queries.getByText('Show affirmation')).toBeTruthy();
  });

  it('keeps loading and error states', async () => {
    (useStory as jest.Mock).mockReturnValue({ data: undefined, isLoading: true, error: null });
    const loading = await renderStory();
    expect(loading.getByText('Loading story...')).toBeTruthy();
    await loading.unmount();

    (useStory as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, error: new Error('fail') });
    await renderStory();
    const errorHeader = mockStackScreen.mock.calls.at(-1)![0].options.headerLeft();
    const header = await render(errorHeader);
    await fireEvent.press(header.getByTestId('story-header-back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('plays through the integrated player and prefetches narration', async () => {
    const queries = await renderStory();
    await fireEvent.press(queries.getByTestId('play-pause-button'));
    expect(mockPlayStory).toHaveBeenCalledWith(MOCK_STORY);
    expect(require('@/lib/audio-utils').prefetchStoryAudio).toHaveBeenCalledWith(
      'story-1',
      'Once upon a time...',
    );
  });

  it.each(['fading', 'pillow_talk', 'affirmation', 'fade_to_black'] as const)(
    'prevents route removal and finishes wind-down during %s',
    async (postStoryPhase) => {
      mockUsePlayer.mockImplementation(() => basePlayerMock({ postStoryPhase }));
      await renderStory();
      const listener = mockNavigation.addListener.mock.calls[0][1] as (event: {
        preventDefault: jest.Mock;
        data: { action: object };
      }) => void;
      const event = { preventDefault: jest.fn(), data: { action: {} } };
      await act(async () => listener(event));
      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(mockFinishWindDown).toHaveBeenCalledTimes(1);
    },
  );

  it('removes the post-story guard and navigates once after completion', async () => {
    mockUsePlayer.mockImplementation(() => basePlayerMock({ postStoryPhase: 'done' }));
    await renderStory();
    expect(mockNavigation.addListener).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('uses native header actions for ordinary Back and idle Sleep Mode', async () => {
    await renderStory();
    const options = mockStackScreen.mock.calls.at(-1)![0].options;
    expect(options.title).toBe(MOCK_STORY.title);
    const back = await render(options.headerLeft());
    await fireEvent.press(back.getByTestId('story-header-back'));
    expect(mockStopStory).toHaveBeenCalledTimes(1);
    expect(router.back).toHaveBeenCalledTimes(1);

    const sleep = await render(options.headerRight());
    await fireEvent.press(sleep.getByTestId('story-header-sleep'));
    expect(mockToggleSleepMode).toHaveBeenCalledTimes(1);
  });

  it('uses header Back to finish wind-down and removes header actions during terminal fade', async () => {
    mockUsePlayer.mockImplementation(() => basePlayerMock({ postStoryPhase: 'pillow_talk' }));
    await renderStory();
    const windDownOptions = mockStackScreen.mock.calls.at(-1)![0].options;
    const back = await render(windDownOptions.headerLeft());
    await fireEvent.press(back.getByTestId('story-header-back'));
    expect(mockFinishWindDown).toHaveBeenCalledTimes(1);
    expect(windDownOptions.headerRight).toBeUndefined();

    mockUsePlayer.mockImplementation(() => basePlayerMock({ postStoryPhase: 'fade_to_black' }));
    await renderStory();
    const terminalOptions = mockStackScreen.mock.calls.at(-1)![0].options;
    expect(terminalOptions.headerLeft).toBeUndefined();
    expect(terminalOptions.headerRight).toBeUndefined();
  });
});

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
  const makeChainable = () => {
    const obj: Record<string, unknown> = {};
    const chain = () => obj;
    obj.activeOffsetX = chain;
    obj.activeOffsetY = chain;
    obj.onBegin = chain;
    obj.onUpdate = chain;
    obj.onFinalize = chain;
    obj.onEnd = (fn: unknown) => {
      obj._onEndFn = fn;
      return obj;
    };
    obj.onStart = chain;
    obj.onChange = chain;
    return obj;
  };
  return {
    Gesture: {
      Pan: () => makeChainable(),
      Tap: () => makeChainable(),
      Race: (...gestures: unknown[]) => gestures,
    },
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

  const basePlayerMock = (overrides = {}) => ({
    currentStory: null,
    isPlaying: false,
    isBuffering: false,
    isSleepMode: false,
    position: 0,
    duration: 60,
    postStoryPhase: 'idle' as const,
    playStory: mockPlayStory,
    pause: mockPause,
    resume: mockResume,
    seekTo: mockSeekTo,
    stopStory: jest.fn(),
    toggleSleepMode: mockToggleSleepMode,
    skipPillowTalk: jest.fn(),
    confirmAffirmation: jest.fn(),
    startFadeToBlack: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePlayer.mockImplementation(() => basePlayerMock());
  });

  afterEach(() => {
    cleanup();
  });

  describe('Wind-Down UX in StoryPlayer', () => {
    it('calls startFadeToBlack when Goodnight button is pressed', async () => {
      const mockStartFadeToBlack = jest.fn();
      mockUsePlayer.mockImplementation(() =>
        basePlayerMock({
          postStoryPhase: 'affirmation',
          startFadeToBlack: mockStartFadeToBlack,
        }),
      );
      const queries = await render(<StoryPlayer {...defaultProps} postStoryPhase="affirmation" />);
      await fireEvent.press(queries.getByText('Goodnight'));
      expect(mockStartFadeToBlack).toHaveBeenCalledTimes(1);
    });

    it('calls startFadeToBlack when Skip for tonight button is pressed in pillow_talk phase', async () => {
      const mockStartFadeToBlack = jest.fn();
      mockUsePlayer.mockImplementation(() =>
        basePlayerMock({
          postStoryPhase: 'pillow_talk',
          startFadeToBlack: mockStartFadeToBlack,
        }),
      );
      const queries = await render(<StoryPlayer {...defaultProps} postStoryPhase="pillow_talk" />);
      await fireEvent.press(queries.getByText('Skip for tonight'));
      expect(mockStartFadeToBlack).toHaveBeenCalledTimes(1);
    });

    it('calls skipPillowTalk when Next button is pressed in pillow_talk phase', async () => {
      const mockSkipPillowTalk = jest.fn();
      mockUsePlayer.mockImplementation(() =>
        basePlayerMock({
          postStoryPhase: 'pillow_talk',
          skipPillowTalk: mockSkipPillowTalk,
        }),
      );
      const queries = await render(<StoryPlayer {...defaultProps} postStoryPhase="pillow_talk" />);
      await fireEvent.press(queries.getByText('Next'));
      expect(mockSkipPillowTalk).toHaveBeenCalledTimes(1);
    });

    it('hides controls after 5 seconds instead of 15 seconds', async () => {
      jest.useFakeTimers();
      try {
        mockUsePlayer.mockImplementation(() =>
          basePlayerMock({
            postStoryPhase: 'pillow_talk',
          }),
        );
        const queries = await render(<StoryPlayer {...defaultProps} postStoryPhase="pillow_talk" />);
        expect(queries.getByText('Next')).toBeTruthy();

        await act(async () => {
          jest.advanceTimersByTime(5100);
        });
        expect(queries.queryByText('Next')).toBeNull();
      } finally {
        jest.useRealTimers();
      }
    });

    it('renders GestureHintCue text for pillow_talk phase', async () => {
      mockUsePlayer.mockImplementation(() =>
        basePlayerMock({
          postStoryPhase: 'pillow_talk',
        }),
      );
      const queries = await render(<StoryPlayer {...defaultProps} postStoryPhase="pillow_talk" />);
      expect(queries.getByText('Swipe for Affirmation →')).toBeTruthy();
    });

    it('renders GestureHintCue text for affirmation phase', async () => {
      mockUsePlayer.mockImplementation(() =>
        basePlayerMock({
          postStoryPhase: 'affirmation',
        }),
      );
      const queries = await render(<StoryPlayer {...defaultProps} postStoryPhase="affirmation" />);
      expect(queries.getByText('Swipe for Goodnight ↑')).toBeTruthy();
    });
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

  it('renders placeholder emoji when imageSource is null', async () => {
    const { getByText } = await render(
      <StoryPlayer {...defaultProps} imageSource={null} />
    );
    expect(getByText('🐻')).toBeTruthy();
  });

  it('renders placeholder emoji when image onError fires', async () => {
    const { getByText, getByTestId } = await render(<StoryPlayer {...defaultProps} />);
    await act(async () => {
      fireEvent(getByTestId('artwork-image'), 'error', { nativeEvent: {} });
    });
    expect(getByText('🐻')).toBeTruthy();
  });

  it('calls playStory when Play is pressed while not playing', async () => {
    const { getByTestId } = await render(<StoryPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('play-pause-button'));
    expect(mockPlayStory).toHaveBeenCalledWith(MOCK_STORY);
  });

  it('calls resume when Play is pressed while paused on current story', async () => {
    mockUsePlayer.mockImplementation(() =>
      basePlayerMock({
        currentStory: MOCK_STORY,
        isPlaying: false,
        position: 15,
      }),
    );
    const { getByTestId } = await render(<StoryPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('play-pause-button'));
    expect(mockResume).toHaveBeenCalledTimes(1);
  });

  it('calls pause when Play is pressed while playing', async () => {
    mockUsePlayer.mockImplementation(() =>
      basePlayerMock({
        currentStory: MOCK_STORY,
        isPlaying: true,
        position: 30,
      }),
    );
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

  it('calls seekTo when -15s or +15s buttons are pressed', async () => {
    mockUsePlayer.mockImplementation(() =>
      basePlayerMock({
        currentStory: MOCK_STORY,
        isPlaying: true,
        position: 30,
      }),
    );
    const { getByTestId } = await render(<StoryPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('seek-backward-button'));
    expect(mockSeekTo).toHaveBeenCalledWith(15);

    fireEvent.press(getByTestId('seek-forward-button'));
    expect(mockSeekTo).toHaveBeenCalledWith(45);
  });
});




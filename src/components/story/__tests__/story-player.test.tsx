import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { withRepeat, useReducedMotion } from 'react-native-reanimated';

const mockPlayStory = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockSeekTo = jest.fn();
const mockToggleSleepMode = jest.fn();
const mockShowAffirmation = jest.fn();
const mockFinishWindDown = jest.fn();
const mockCompleteWindDown = jest.fn();

jest.mock('@/contexts/PlayerContext', () => ({
  usePlayer: jest.fn(),
}));

import { StoryPlayer } from '../story-player';
import { usePlayer } from '@/contexts/PlayerContext';

const mockUsePlayer = usePlayer as jest.Mock;
const mockUseReducedMotion = useReducedMotion as jest.Mock;
const mockWithRepeat = withRepeat as jest.Mock;

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

const defaultProps = {
  story: MOCK_STORY,
  protagonist: MOCK_PROTAGONIST,
  imageSource: { uri: 'https://example.com/cover.png' },
  topInset: 91,
};

const basePlayerMock = (overrides = {}) => ({
  currentStory: null,
  isPlaying: false,
  isBuffering: false,
  isSleepMode: false,
  position: 0,
  playbackError: null,
  duration: 60,
  postStoryPhase: 'idle' as const,
  playStory: mockPlayStory,
  pause: mockPause,
  resume: mockResume,
  seekTo: mockSeekTo,
  stopStory: jest.fn(),
  toggleSleepMode: mockToggleSleepMode,
  showAffirmation: mockShowAffirmation,
  finishWindDown: mockFinishWindDown,
  completeWindDown: mockCompleteWindDown,
  ...overrides,
});

describe('StoryPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
    mockUsePlayer.mockImplementation(() => basePlayerMock());
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockClear();
  });

  it('renders ordinary playback without local navigation controls', async () => {
    const queries = await render(<StoryPlayer {...defaultProps} />);
    expect(queries.queryByText('The Toothbrush Adventure', { exact: false })).toBeNull();
    expect(queries.getByTestId('play-pause-button')).toBeTruthy();
    expect(queries.queryByTestId('player-back-button')).toBeNull();
    expect(queries.queryByTestId('sleep-mode-button')).toBeNull();
  });

  it('plays, pauses, resumes, and seeks using player context', async () => {
    const queries = await render(<StoryPlayer {...defaultProps} />);
    await fireEvent.press(queries.getByTestId('play-pause-button'));
    expect(mockPlayStory).toHaveBeenCalledWith(MOCK_STORY);
    await fireEvent.press(queries.getByTestId('seek-backward-button'));
    await fireEvent.press(queries.getByTestId('seek-forward-button'));
    expect(mockSeekTo).toHaveBeenNthCalledWith(1, 0);
    expect(mockSeekTo).toHaveBeenNthCalledWith(2, 15);

    mockUsePlayer.mockImplementation(() =>
      basePlayerMock({ currentStory: MOCK_STORY, isPlaying: true, position: 30 }),
    );
    const playing = await render(<StoryPlayer {...defaultProps} />);
    await fireEvent.press(playing.getByTestId('play-pause-button'));
    expect(mockPause).toHaveBeenCalledTimes(1);
  });

  it('announces the playback error and keeps the play button actionable', async () => {
    mockUsePlayer.mockImplementation(() =>
      basePlayerMock({ playbackError: 'Something went wrong loading the story audio. Tap play to try again.' }),
    );
    const queries = await render(<StoryPlayer {...defaultProps} />);
    expect(queries.getByTestId('playback-error')).toBeTruthy();
    expect(queries.getByText('Something went wrong loading the story audio. Tap play to try again.')).toBeTruthy();
    await fireEvent.press(queries.getByTestId('play-pause-button'));
    expect(mockPlayStory).toHaveBeenCalledWith(MOCK_STORY);
  });

  it('keeps Pillow Talk visible and gives its actions distinct outcomes', async () => {
    mockUsePlayer.mockImplementation(() => basePlayerMock({ postStoryPhase: 'pillow_talk' }));
    const queries = await render(<StoryPlayer {...defaultProps} />);
    expect(queries.getByText('Pillow talk')).toBeTruthy();
    expect(queries.getByText('What was your favorite part?')).toBeTruthy();
    expect(queries.getByTestId('artwork-image')).toBeTruthy();
    expect(queries.queryByTestId('sleep-mode-button')).toBeNull();

    await fireEvent.press(queries.getByText('Show affirmation'));
    await fireEvent.press(queries.getByText('Skip wind-down'));
    expect(mockShowAffirmation).toHaveBeenCalledTimes(1);
    expect(mockFinishWindDown).toHaveBeenCalledTimes(1);
    expect(queries.queryByText(['Swipe', 'for'].join(' '))).toBeNull();
  });

  it('announces each generated content phase once on entry', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    mockUsePlayer.mockImplementation(() => basePlayerMock({ postStoryPhase: 'pillow_talk' }));
    await render(<StoryPlayer {...defaultProps} />);
    expect(announce).toHaveBeenCalledWith('Pillow talk. What was your favorite part?');

    mockUsePlayer.mockImplementation(() => basePlayerMock({ postStoryPhase: 'affirmation' }));
    await render(<StoryPlayer {...defaultProps} />);
    expect(announce).toHaveBeenCalledWith('Say together. I am brave and kind.');
  });

  it('reannounces Pillow Talk after an intervening non-content phase', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    mockUsePlayer.mockImplementation(() => basePlayerMock({ postStoryPhase: 'pillow_talk' }));
    const queries = await render(<StoryPlayer {...defaultProps} />);
    mockUsePlayer.mockImplementation(() => basePlayerMock({ postStoryPhase: 'fading' }));
    await queries.rerender(<StoryPlayer {...defaultProps} />);
    mockUsePlayer.mockImplementation(() => basePlayerMock({ postStoryPhase: 'pillow_talk' }));
    await queries.rerender(<StoryPlayer {...defaultProps} />);
    expect(announce).toHaveBeenCalledTimes(2);
  });

  it('keeps content actions rendered beyond the former control timers', async () => {
    jest.useFakeTimers();
    mockUsePlayer.mockImplementation(() => basePlayerMock({ postStoryPhase: 'pillow_talk' }));
    const queries = await render(<StoryPlayer {...defaultProps} />);
    await act(async () => jest.advanceTimersByTime(20000));
    expect(queries.getByText('Show affirmation')).toBeTruthy();
    expect(queries.getByText('Skip wind-down')).toBeTruthy();
    jest.useRealTimers();
  });

  it('renders affirmation without artwork and finishes through Goodnight', async () => {
    mockUsePlayer.mockImplementation(() => basePlayerMock({ postStoryPhase: 'affirmation' }));
    const queries = await render(<StoryPlayer {...defaultProps} />);
    expect(queries.getByText('Say together')).toBeTruthy();
    expect(queries.getByText('I am brave and kind.')).toBeTruthy();
    expect(queries.queryByTestId('artwork-image')).toBeNull();
    expect(queries.queryByText('Show affirmation')).toBeNull();
    await fireEvent.press(queries.getByText('Goodnight'));
    expect(mockFinishWindDown).toHaveBeenCalledTimes(1);
  });

  it('intercepts input behind the terminal curtain and completes it once', async () => {
    mockUsePlayer.mockImplementation(() => basePlayerMock({ postStoryPhase: 'fade_to_black' }));
    const queries = await render(<StoryPlayer {...defaultProps} />);
    expect(queries.getByTestId('terminal-curtain').props.pointerEvents).toBe('auto');
    expect(queries.queryByText('Goodnight')).toBeNull();
    expect(mockCompleteWindDown).toHaveBeenCalledTimes(1);
    expect(queries.queryByTestId('player-back-button')).toBeNull();
  });

  it('makes artwork drift static under reduced motion while retaining terminal fade', async () => {
    mockUseReducedMotion.mockReturnValue(true);
    mockUsePlayer.mockImplementation(() =>
      basePlayerMock({ currentStory: MOCK_STORY, isPlaying: true, postStoryPhase: 'fade_to_black' }),
    );
    const queries = await render(<StoryPlayer {...defaultProps} />);
    expect(mockWithRepeat).not.toHaveBeenCalled();
    expect(queries.getByTestId('terminal-curtain')).toBeTruthy();
  });

  it('renders a protagonist fallback after a cover load failure', async () => {
    const queries = await render(<StoryPlayer {...defaultProps} />);
    await fireEvent(queries.getByTestId('artwork-image'), 'error', { nativeEvent: {} });
    expect(queries.getByText('🐻')).toBeTruthy();
  });
});

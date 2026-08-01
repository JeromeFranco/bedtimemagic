import { render, fireEvent, act } from '@testing-library/react-native';
import { PillowTalk } from '../pillow-talk';

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

describe('PillowTalk', () => {
  const defaultProps = {
    story: MOCK_STORY,
    protagonistEmoji: '🐻',
    imageSource: { uri: 'https://example.com/cover.png' },
    onSkip: jest.fn(),
    onImageError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => jest.useRealTimers());

  it('renders pillow talk prompt text', async () => {
    const { getByText } = await render(<PillowTalk {...defaultProps} />);
    expect(getByText('What was your favorite part?')).toBeTruthy();
  });

  it('renders Next and Skip buttons', async () => {
    const { getByText } = await render(<PillowTalk {...defaultProps} />);
    expect(getByText('Next')).toBeTruthy();
    expect(getByText('Skip for tonight')).toBeTruthy();
  });

  it('calls onSkip when Next is pressed', async () => {
    const { getByText } = await render(<PillowTalk {...defaultProps} />);
    fireEvent.press(getByText('Next'));
    expect(defaultProps.onSkip).toHaveBeenCalledTimes(1);
  });

  it('calls onSkip when Skip for tonight is pressed', async () => {
    const { getByText } = await render(<PillowTalk {...defaultProps} />);
    fireEvent.press(getByText('Skip for tonight'));
    expect(defaultProps.onSkip).toHaveBeenCalledTimes(1);
  });

  it('hides buttons after 15s and shows on tap', async () => {
    const { getByText, queryByText } = await render(<PillowTalk {...defaultProps} />);
    expect(getByText('Next')).toBeTruthy();

    await act(async () => { jest.advanceTimersByTime(15000); });
    expect(queryByText('Next')).toBeNull();

    await act(async () => { fireEvent.press(getByText('What was your favorite part?')); });
    expect(getByText('Next')).toBeTruthy();
  });
});

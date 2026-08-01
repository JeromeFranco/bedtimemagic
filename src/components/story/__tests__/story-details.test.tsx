import { render, fireEvent } from '@testing-library/react-native';
import { StoryDetails } from '../story-details';

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

describe('StoryDetails', () => {
  const defaultProps = {
    story: MOCK_STORY,
    protagonist: MOCK_PROTAGONIST,
    imageSource: { uri: 'https://example.com/cover.png' },
    onBack: jest.fn(),
    onPlay: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders story title', async () => {
    const { getByText } = await render(<StoryDetails {...defaultProps} />);
    expect(getByText('The Toothbrush Adventure')).toBeTruthy();
  });

  it('renders moral', async () => {
    const { getByText } = await render(<StoryDetails {...defaultProps} />);
    expect(getByText('Brushing teeth keeps your smile bright.')).toBeTruthy();
  });

  it('renders protagonist name without emoji', async () => {
    const { getByText } = await render(<StoryDetails {...defaultProps} />);
    expect(getByText('Barnaby')).toBeTruthy();
  });

  it('renders Play Story button and calls onPlay', async () => {
    const { getByText } = await render(<StoryDetails {...defaultProps} />);
    fireEvent.press(getByText('Play Story'));
    expect(defaultProps.onPlay).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when back button pressed', async () => {
    const { getByTestId } = await render(<StoryDetails {...defaultProps} />);
    fireEvent.press(getByTestId('back-button'));
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows placeholder when imageSource is null', async () => {
    const { getByText } = await render(
      <StoryDetails {...defaultProps} imageSource={null} />,
    );
    expect(getByText('🐻')).toBeTruthy();
  });
});

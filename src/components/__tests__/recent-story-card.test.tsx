import { fireEvent, render } from '@testing-library/react-native';

import { RecentStoryCard } from '../recent-story-card';
import type { Story } from '@/types';

const STORY: Story = {
  id: 'story-1',
  user_id: 'user-1',
  child_id: 'child-1',
  title: 'Mia and the Brave Toothbrush',
  story_text: 'Once upon a time.',
  moral: 'Brushing is brave.',
  pillow_talk_prompt: 'What was your favorite part?',
  sleepy_affirmation: 'I am brave.',
  cover_image_url: 'https://example.com/cover.png',
  challenge: 'refusing_teeth',
  protagonist: 'barnaby',
  created_at: '2026-08-14T00:00:00Z',
};

const NO_COVER_STORY: Story = {
  ...STORY,
  title: 'A Story Without Art',
  cover_image_url: null,
};

describe('RecentStoryCard', () => {
  it('renders the title and protagonist subtitle', async () => {
    const { getByText } = await render(
      <RecentStoryCard story={STORY} onPress={jest.fn()} />,
    );
    expect(getByText(STORY.title)).toBeTruthy();
    expect(getByText('Barnaby · 10 min')).toBeTruthy();
  });

  it('renders the cover image when a cover url is present', async () => {
    const { getByTestId, queryByTestId } = await render(
      <RecentStoryCard story={STORY} onPress={jest.fn()} />,
    );
    expect(getByTestId('recent-cover-image')).toBeTruthy();
    expect(queryByTestId('recent-cover-placeholder')).toBeNull();
  });

  it('renders a solid placeholder with no emoji when cover url is null', async () => {
    const { getByTestId, queryByTestId, queryByText } = await render(
      <RecentStoryCard story={NO_COVER_STORY} onPress={jest.fn()} />,
    );
    expect(getByTestId('recent-cover-placeholder')).toBeTruthy();
    expect(queryByTestId('recent-cover-image')).toBeNull();
    expect(queryByText('📖')).toBeNull();
    expect(queryByText('🐻')).toBeNull();
  });

  it('renders a chevron disclosure symbol', async () => {
    const { getByText } = await render(
      <RecentStoryCard story={STORY} onPress={jest.fn()} />,
    );
    expect(getByText('chevron.right')).toBeTruthy();
  });

  it('is an accessible button that fires onPress when pressed', async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await render(
      <RecentStoryCard story={STORY} onPress={onPress} />,
    );
    const card = getByLabelText(`Listen to ${STORY.title} again`);
    await fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

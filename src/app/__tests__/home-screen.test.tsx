import { fireEvent, render } from '@testing-library/react-native';

import HomeScreen from '../(index,vault)/index';
import { router } from 'expo-router';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { useStoryGeneration } from '@/contexts/StoryGenerationContext';
import { useStories } from '@/hooks/use-story';
import type { Story } from '@/types';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/contexts/SelectedChildContext', () => ({ useSelectedChild: jest.fn() }));
jest.mock('@/contexts/StoryGenerationContext', () => ({ useStoryGeneration: jest.fn() }));
jest.mock('@/hooks/use-story', () => ({ useStories: jest.fn() }));
jest.mock('@/components/profile-selector', () => ({ ProfileSelector: () => null }));
jest.mock('@/components/challenge-matrix', () => ({ ChallengeMatrix: () => null }));

const mockPush = jest.mocked(router.push);
const mockUseStories = jest.mocked(useStories);
const mockUseSelectedChild = jest.mocked(useSelectedChild);
const mockUseStoryGeneration = jest.mocked(useStoryGeneration);

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

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelectedChild.mockReturnValue({
      profiles: [],
      selectedProfile: {
        id: 'child-1',
        user_id: 'user-1',
        name: 'Mia',
        developmental_stage: 'preschool',
        protagonist: 'barnaby',
        emoji: '🌙',
        created_at: '2026-08-13T00:00:00Z',
      },
      setSelectedProfile: jest.fn(),
    } as never);
    mockUseStoryGeneration.mockReturnValue({ startGeneration: jest.fn() } as never);
  });

  it('renders the warm headline and subtitle and no recent card when there is no recent story', async () => {
    mockUseStories.mockReturnValue({ data: [] } as never);

    const { getByText, queryByText } = await render(<HomeScreen />);

    expect(getByText("Tonight's story for Mia")).toBeTruthy();
    expect(getByText('Barnaby will tell it · about 10 minutes')).toBeTruthy();
    expect(queryByText('Or make a new one')).toBeNull();
    expect(queryByText(STORY.title)).toBeNull();
  });

  it('renders the recent card and section label, and routes to /story on press', async () => {
    mockUseStories.mockReturnValue({ data: [STORY] } as never);

    const view = await render(<HomeScreen />);

    expect(view.getByText('Or make a new one')).toBeTruthy();
    expect(view.getByText(STORY.title)).toBeTruthy();
    expect(view.getByLabelText(`Listen to ${STORY.title} again`)).toBeTruthy();

    await fireEvent.press(view.getByText(STORY.title));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/story',
      params: { id: 'story-1' },
    });
  });
});

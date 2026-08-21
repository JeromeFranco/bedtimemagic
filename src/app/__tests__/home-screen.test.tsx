import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '../(app)/(index,vault)/index';
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

const mockPush = jest.mocked(router.push);
const mockUseStories = jest.mocked(useStories);
const mockUseSelectedChild = jest.mocked(useSelectedChild);
const mockUseStoryGeneration = jest.mocked(useStoryGeneration);
const mockResumeWaiting = jest.fn();

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

function renderHome() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <HomeScreen />
    </SafeAreaProvider>,
  );
}

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
        created_at: '2026-08-13T00:00:00Z',
      },
      setSelectedProfile: jest.fn(),
    } as never);
    mockUseStoryGeneration.mockReturnValue({
      state: { status: 'idle' },
      resumeWaiting: mockResumeWaiting,
    } as never);
  });

  it('shows one creation action and routes idle parents to Create', async () => {
    mockUseStories.mockReturnValue({ data: [] } as never);
    const view = await renderHome();

    expect(view.getByText("Tonight's story for Mia")).toBeTruthy();
    expect(view.getByText('Barnaby will tell it · about 10 minutes')).toBeTruthy();
    expect(view.queryByText('Or make a new one')).toBeNull();
    expect(view.queryByText('What needs a story tonight?')).toBeNull();

    fireEvent.press(view.getByText("Create Tonight's Story"));
    expect(mockPush).toHaveBeenCalledWith('/create');
  });

  it('adds a non-interactive screen-owned status-bar scrim', async () => {
    mockUseStories.mockReturnValue({ data: [] } as never);
    const view = await renderHome();

    expect(view.getByTestId('status-bar-scrim').props.pointerEvents).toBe('none');
  });

  it('keeps recent-story replay secondary to the creation action', async () => {
    mockUseStories.mockReturnValue({ data: [STORY] } as never);
    const view = await renderHome();

    expect(view.getByText(STORY.title)).toBeTruthy();
    fireEvent.press(view.getByText(STORY.title));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/story',
      params: { id: 'story-1' },
    });
  });

  it('returns an active generation to its existing waiting screen', async () => {
    mockUseStories.mockReturnValue({ data: [] } as never);
    mockUseStoryGeneration.mockReturnValue({
      state: { status: 'generating' },
      resumeWaiting: mockResumeWaiting,
    } as never);
    const view = await renderHome();

    fireEvent.press(view.getByText("Create Tonight's Story"));
    expect(mockResumeWaiting).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/generate');
  });

  it('does not offer the setup route before a child is selected', async () => {
    mockUseStories.mockReturnValue({ data: [] } as never);
    mockUseSelectedChild.mockReturnValue({
      profiles: [],
      selectedProfile: null,
      setSelectedProfile: jest.fn(),
    } as never);
    const view = await renderHome();

    fireEvent.press(view.getByText("Create Tonight's Story"));
    expect(mockPush).not.toHaveBeenCalled();
  });
});

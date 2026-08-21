import { act, fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import CreateStoryScreen from '../(app)/(index,vault)/create';
import { router } from 'expo-router';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { useStoryGeneration } from '@/contexts/StoryGenerationContext';

jest.mock('expo-router', () => {
  let beforeRemoveListener: ((event: {
    preventDefault: () => void;
    data: { action: unknown };
  }) => void) | null = null;
  const navigation = {
    addListener: jest.fn((eventName: string, listener: typeof beforeRemoveListener) => {
      if (eventName === 'beforeRemove') beforeRemoveListener = listener;
      return () => {
        if (beforeRemoveListener === listener) beforeRemoveListener = null;
      };
    }),
  };
  return {
    router: { replace: jest.fn() },
    useNavigation: () => navigation,
    __testNavigation: navigation,
  };
});

jest.mock('@/contexts/SelectedChildContext', () => ({ useSelectedChild: jest.fn() }));
jest.mock('@/contexts/StoryGenerationContext', () => ({ useStoryGeneration: jest.fn() }));

const mockReplace = jest.mocked(router.replace);
const mockUseSelectedChild = jest.mocked(useSelectedChild);
const mockUseStoryGeneration = jest.mocked(useStoryGeneration);
const mockStartGeneration = jest.fn();
const mockResumeWaiting = jest.fn();
const navigation = (jest.requireMock('expo-router') as {
  __testNavigation: { addListener: jest.Mock };
}).__testNavigation;

function mockProfile(selectedProfile = true) {
  mockUseSelectedChild.mockReturnValue({
    profiles: [],
    selectedProfile: selectedProfile
      ? {
          id: 'child-1',
          user_id: 'user-1',
          name: 'Mia',
          developmental_stage: 'preschool',
          protagonist: 'barnaby',
          created_at: '2026-08-13T00:00:00Z',
        }
      : null,
    setSelectedProfile: jest.fn(),
  } as never);
}

function renderCreate() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <CreateStoryScreen />
    </SafeAreaProvider>,
  );
}

describe('CreateStoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfile();
    mockStartGeneration.mockReturnValue({ status: 'started' });
    mockUseStoryGeneration.mockReturnValue({
      startGeneration: mockStartGeneration,
      resumeWaiting: mockResumeWaiting,
    } as never);
  });

  it('shows child context, categories, and only matching triggers', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const view = await renderCreate();

    expect(view.getByText('A story for Mia')).toBeTruthy();
    expect(view.getByText('What needs a story tonight?')).toBeTruthy();
    expect(view.getByText('Screen Time Limits')).toBeTruthy();

    await fireEvent.press(view.getByTestId('category-bedtime'));
    expect(view.getByText('What happened?')).toBeTruthy();
    expect(view.getByText('Refusing to brush teeth')).toBeTruthy();
    expect(view.queryByText('Stopping video games')).toBeNull();
    expect(announce).toHaveBeenCalledWith('Bedtime Friction selected. What happened?');
    announce.mockRestore();
  });

  it('starts the exact snapshot and replaces Create after a trigger selection', async () => {
    const view = await renderCreate();

    await fireEvent.press(view.getByTestId('category-bedtime'));
    await fireEvent.press(view.getByTestId('trigger-refusing_teeth'));

    expect(mockStartGeneration).toHaveBeenCalledWith({
      childId: 'child-1',
      childName: 'Mia',
      protagonist: 'barnaby',
      developmentalStage: 'preschool',
      category: 'bedtime',
      trigger: 'refusing_teeth',
    });
    expect(mockReplace).toHaveBeenCalledWith('/generate');
  });

  it('returns trigger selection to categories for a normal native back removal', async () => {
    const view = await renderCreate();
    await fireEvent.press(view.getByTestId('category-bedtime'));
    const listener = navigation.addListener.mock.calls.at(-1)![1];
    const event = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };

    await act(async () => {
      listener(event);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(view.getByText('What needs a story tonight?')).toBeTruthy();
  });

  it('allows the terminal replacement removal and resumes an existing request', async () => {
    mockStartGeneration.mockReturnValue({ status: 'already-generating' });
    const view = await renderCreate();
    await fireEvent.press(view.getByTestId('category-bedtime'));
    const listener = navigation.addListener.mock.calls.at(-1)![1];

    await fireEvent.press(view.getByTestId('trigger-refusing_teeth'));
    const event = { preventDefault: jest.fn(), data: { action: { type: 'REPLACE' } } };
    listener(event);

    expect(mockStartGeneration).toHaveBeenCalledTimes(1);
    expect(mockResumeWaiting).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/generate');
  });

  it('does not issue a request when no child profile is selected', async () => {
    mockProfile(false);
    const view = await renderCreate();

    await fireEvent.press(view.getByTestId('category-bedtime'));
    await fireEvent.press(view.getByTestId('trigger-refusing_teeth'));

    expect(mockStartGeneration).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo, Alert, Pressable } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import GenerateScreen from '../(app)/(index,vault)/generate';
import { router, usePathname } from 'expo-router';
import { StoryGenerationProvider, useStoryGeneration } from '@/contexts/StoryGenerationContext';
import { generateStory } from '@/api/stories';
import { StoryGenerationStatus } from '@/components/story-generation-status';
import type { Story } from '@/types';

jest.mock('expo-router', () => {
  let beforeRemoveListener: ((event: {
    preventDefault: () => void;
    data: { action: unknown };
  }) => void) | null = null;
  const notifyBeforeRemove = (action: unknown) => {
    const event = {
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      data: { action },
    };
    beforeRemoveListener?.(event);
    return event;
  };
  const navigation = {
    addListener: jest.fn((eventName: string, listener: typeof beforeRemoveListener) => {
      if (eventName === 'beforeRemove') beforeRemoveListener = listener;
      return () => {
        if (beforeRemoveListener === listener) beforeRemoveListener = null;
      };
    }),
    dispatch: jest.fn((action: unknown) => notifyBeforeRemove(action)),
  };
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(() => notifyBeforeRemove({ type: 'GO_BACK' })),
    },
    Stack: { Screen: jest.fn(() => null) },
    useNavigation: () => navigation,
    usePathname: jest.fn(() => '/'),
    __testNavigation: navigation,
  };
});

jest.mock('@/api/stories', () => ({
  generateStory: jest.fn(),
}));

jest.mock('@/components/breathing-circle', () => ({ BreathingCircle: () => null }));
jest.mock('@/components/calming-copy', () => ({ CalmingCopy: () => null }));

const mockPush = jest.mocked(router.push);
const mockReplace = jest.mocked(router.replace);
const mockBack = jest.mocked(router.back);
const mockPathname = jest.mocked(usePathname);
const navigation = (jest.requireMock('expo-router') as {
  __testNavigation: { addListener: jest.Mock; dispatch: jest.Mock };
}).__testNavigation;
const mockStackScreen = (jest.requireMock('expo-router') as {
  Stack: { Screen: jest.Mock };
}).Stack.Screen;
const mockAddListener = navigation.addListener;
const mockDispatch = navigation.dispatch;
const clients: QueryClient[] = [];

const SNAPSHOT = {
  childId: 'child-1',
  childName: 'Mia',
  protagonist: 'barnaby' as const,
  developmentalStage: 'preschool' as const,
  category: 'bedtime' as const,
  trigger: 'refusing_teeth' as const,
};

function StartGenerationHarness() {
  const generation = useStoryGeneration();
  return (
    <Pressable
      testID="start-generation"
      onPress={() => generation.startGeneration(SNAPSHOT)}
    />
  );
}

function StatusHarness() {
  const generation = useStoryGeneration();
  return (
    <>
      <Pressable
        testID="start-background"
        onPress={() => {
          generation.startGeneration(SNAPSHOT);
          generation.continueInBackground();
        }}
      />
      <StoryGenerationStatus />
    </>
  );
}

const STORY: Story = {
  id: 'story-1',
  user_id: 'user-1',
  child_id: 'child-1',
  title: 'Mia and the Toothbrush',
  story_text: 'Once upon a time...',
  moral: 'Brushing teeth is brave.',
  pillow_talk_prompt: 'What was your favourite part?',
  sleepy_affirmation: 'I am brave.',
  cover_image_url: null,
  challenge: 'refusing_teeth',
  protagonist: 'barnaby',
  created_at: '2026-08-13T00:00:00Z',
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function withSafeArea(children: ReactNode) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      {children}
    </SafeAreaProvider>
  );
}

async function renderWorkflow(screen: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  const view = await render(withSafeArea(
    <QueryClientProvider client={client}>
      <StoryGenerationProvider>{screen}</StoryGenerationProvider>
    </QueryClientProvider>,
  ));
  return { ...view, client };
}

describe('story generation workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.mockReturnValue('/');
  });

  afterEach(() => {
    clients.splice(0).forEach((client) => client.clear());
  });

  it('starts one request when the generation entry point is pressed twice', async () => {
    const pending = deferred<Story>();
    jest.mocked(generateStory).mockReturnValue(pending.promise);
    const view = await renderWorkflow(<StartGenerationHarness />);

    await fireEvent.press(view.getByTestId('start-generation'));
    await fireEvent.press(view.getByTestId('start-generation'));

    expect(generateStory).toHaveBeenCalledTimes(1);
    expect(generateStory).toHaveBeenCalledWith(
      'child-1', 'barnaby', 'Mia', 'preschool', 'bedtime', 'refusing_teeth', expect.any(AbortSignal),
    );
    view.client.clear();
    await view.unmount();
  });

  it('only observes existing work on route mount and replaces with a waiting success once', async () => {
    const pending = deferred<Story>();
    jest.mocked(generateStory).mockReturnValue(pending.promise);
    const view = await renderWorkflow(<StartGenerationHarness />);

    await fireEvent.press(view.getByTestId('start-generation'));
    await view.rerender(withSafeArea(
      <QueryClientProvider client={view.client}>
        <StoryGenerationProvider><GenerateScreen /></StoryGenerationProvider>
      </QueryClientProvider>,
    ));
    expect(generateStory).toHaveBeenCalledTimes(1);
    mockReplace.mockClear();

    await act(async () => {
      pending.resolve(STORY);
    });
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/story', params: { id: 'story-1' } });
    view.client.clear();
    await view.unmount();
  });

  it('keeps or cancels active work through the native header Back confirmation', async () => {
    const pending = deferred<Story>();
    jest.mocked(generateStory).mockReturnValue(pending.promise);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const view = await renderWorkflow(<StartGenerationHarness />);

    await fireEvent.press(view.getByTestId('start-generation'));
    await view.rerender(withSafeArea(
      <QueryClientProvider client={view.client}>
        <StoryGenerationProvider>
          <GenerateScreen />
          <StoryGenerationStatus />
        </StoryGenerationProvider>
      </QueryClientProvider>,
    ));

    const generatingHeader = mockStackScreen.mock.calls.at(-1)![0].options.headerLeft();
    const header = await render(generatingHeader);
    await fireEvent.press(header.getByTestId('generate-header-back'));
    const stayAlert = alert.mock.calls[0][2]!;
    expect(stayAlert.map((button) => button.text)).toEqual(['Stay', 'Keep Creating', 'Cancel Story']);
    await act(async () => {
      stayAlert[0].onPress?.();
    });
    expect(mockBack).toHaveBeenCalledTimes(1);

    await fireEvent.press(header.getByTestId('generate-header-back'));
    await act(async () => {
      alert.mock.calls[1][2]![1].onPress?.();
    });
    expect(mockBack).toHaveBeenCalledTimes(2);
    expect(view.getByText("Writing Mia's story…")).toBeTruthy();
    expect(alert).toHaveBeenCalledTimes(2);

    const beforeRemove = mockAddListener.mock.calls[0][1];
    const event = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
    await act(async () => {
      beforeRemove(event);
      alert.mock.calls[2][2]![2].onPress?.();
    });
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(event.data.action);
    expect(jest.mocked(generateStory).mock.calls[0][6]!.aborted).toBe(true);

    alert.mockRestore();
    view.client.clear();
    await view.unmount();
  });

  it('uses native header Back to dismiss and return after a waiting failure', async () => {
    jest.mocked(generateStory).mockRejectedValueOnce(new Error('network'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const view = await renderWorkflow(<StartGenerationHarness />);

    await fireEvent.press(view.getByTestId('start-generation'));
    await view.rerender(withSafeArea(
      <QueryClientProvider client={view.client}>
        <StoryGenerationProvider><GenerateScreen /></StoryGenerationProvider>
      </QueryClientProvider>,
    ));

    expect(view.getByText('Try Again')).toBeTruthy();
    const failedHeader = mockStackScreen.mock.calls.at(-1)![0].options.headerLeft();
    const header = await render(failedHeader);
    await fireEvent.press(header.getByTestId('generate-header-back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
    view.client.clear();
    await view.unmount();
  });

  it('returns to background generation from its compact status and announces the transition once', async () => {
    const pending = deferred<Story>();
    jest.mocked(generateStory).mockReturnValue(pending.promise);
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const view = await renderWorkflow(<StatusHarness />);

    await fireEvent.press(view.getByTestId('start-background'));

    expect(view.getByText("Writing Mia's story…")).toBeTruthy();
    expect(announce).toHaveBeenCalledWith("Writing Mia's story");
    await fireEvent.press(view.getByText("Writing Mia's story…"));
    expect(mockPush).toHaveBeenCalledWith('/generate');

    announce.mockRestore();
    view.client.clear();
    await view.unmount();
  });

  it('keeps background completion parent-controlled and hides unchanged status during story playback', async () => {
    const pending = deferred<Story>();
    jest.mocked(generateStory).mockReturnValue(pending.promise);
    mockPathname.mockReturnValue('/vault');
    const view = await renderWorkflow(<StatusHarness />);

    await fireEvent.press(view.getByTestId('start-background'));
    await act(async () => {
      pending.resolve(STORY);
    });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(view.getByText("Mia's story is ready")).toBeTruthy();

    mockPathname.mockReturnValue('/story');
    await view.rerender(withSafeArea(
      <QueryClientProvider client={view.client}>
        <StoryGenerationProvider><StatusHarness /></StoryGenerationProvider>
      </QueryClientProvider>,
    ));
    expect(view.queryByText("Mia's story is ready")).toBeNull();

    mockPathname.mockReturnValue('/vault');
    await view.rerender(withSafeArea(
      <QueryClientProvider client={view.client}>
        <StoryGenerationProvider><StatusHarness /></StoryGenerationProvider>
      </QueryClientProvider>,
    ));
    await fireEvent.press(view.getByText('Listen'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/story', params: { id: 'story-1' } });
    expect(view.queryByText('Listen')).toBeNull();

    view.client.clear();
    await view.unmount();
  });

  it('retries and dismisses a background failure without exposing diagnostics', async () => {
    const first = deferred<Story>();
    const second = deferred<Story>();
    jest.mocked(generateStory)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const view = await renderWorkflow(<StatusHarness />);

    await fireEvent.press(view.getByTestId('start-background'));
    await act(async () => {
      first.reject(new Error('provider diagnostics'));
    });
    expect(view.getByText("We couldn't finish Mia's story.")).toBeTruthy();
    expect(view.queryByText('provider diagnostics')).toBeNull();
    await fireEvent.press(view.getByText('Try Again'));
    expect(generateStory).toHaveBeenCalledTimes(2);
    await act(async () => {
      second.reject(new Error('retry diagnostics'));
    });
    await fireEvent.press(view.getByText('Dismiss'));
    expect(view.queryByText("We couldn't finish Mia's story.")).toBeNull();

    errorSpy.mockRestore();
    view.client.clear();
    await view.unmount();
  });
});

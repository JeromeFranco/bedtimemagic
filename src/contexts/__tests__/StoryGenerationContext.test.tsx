import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import type { Story } from '@/types';
import {
  StoryGenerationProvider,
  useStoryGeneration,
  type StoryGenerationContextValue,
  type StoryGenerationSnapshot,
} from '../StoryGenerationContext';
import { generateStory } from '@/api/stories';

jest.mock('@/api/stories', () => ({
  generateStory: jest.fn(),
}));

const SNAPSHOT: StoryGenerationSnapshot = {
  childId: 'child-1',
  childName: 'Mia',
  protagonist: 'barnaby',
  developmentalStage: 'preschool',
  category: 'bedtime',
  trigger: 'refusing_teeth',
};

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

let context: StoryGenerationContextValue;
const clients: QueryClient[] = [];

function Probe({ onContext }: { onContext: (nextContext: StoryGenerationContextValue) => void }) {
  const generation = useStoryGeneration();

  useEffect(() => {
    onContext(generation);
  }, [generation, onContext]);

  return <Text testID="state">{generation.state.status}</Text>;
}

async function renderProvider(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  clients.push(client);
  const view = await render(
    <QueryClientProvider client={client}>
      <StoryGenerationProvider>
        <Probe onContext={(nextContext) => { context = nextContext; }} />
      </StoryGenerationProvider>
    </QueryClientProvider>,
  );

  return { ...view, client };
}

describe('StoryGenerationProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    clients.splice(0).forEach((client) => client.clear());
    context = undefined as never;
  });

  it('starts at idle and captures primitive request ownership once', async () => {
    const pending = deferred<Story>();
    jest.mocked(generateStory).mockReturnValue(pending.promise);
    const view = await renderProvider();

    expect(view.getByTestId('state').props.children).toBe('idle');
    await act(async () => {
      expect(context.startGeneration(SNAPSHOT)).toEqual({ status: 'started' });
    });

    expect(context.state).toMatchObject({
      status: 'generating',
      snapshot: SNAPSHOT,
      hasLeftGenerationScreen: false,
    });
    expect(generateStory).toHaveBeenCalledWith(
      'child-1',
      'barnaby',
      'Mia',
      'preschool',
      'bedtime',
      'refusing_teeth',
      expect.any(AbortSignal),
    );
  });

  it('synchronously rejects duplicate starts and keeps the original inputs', async () => {
    const pending = deferred<Story>();
    jest.mocked(generateStory).mockReturnValue(pending.promise);
    await renderProvider();

    await act(async () => {
      context.startGeneration(SNAPSHOT);
      expect(
        context.startGeneration({ ...SNAPSHOT, childId: 'child-2', childName: 'Noah' }),
      ).toEqual({ status: 'already-generating' });
    });

    expect(generateStory).toHaveBeenCalledTimes(1);
    expect(context.state).toMatchObject({ status: 'generating', snapshot: SNAPSHOT });
  });

  it('seeds the story cache and remains ready when stories invalidation rejects', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateQueries = jest.spyOn(client, 'invalidateQueries').mockRejectedValue(new Error('offline'));
    jest.mocked(generateStory).mockResolvedValue(STORY);
    await renderProvider(client);

    await act(async () => {
      context.startGeneration(SNAPSHOT);
    });

    expect(context.state).toMatchObject({ status: 'ready', story: STORY, snapshot: SNAPSHOT });
    expect(client.getQueryData(['story', STORY.id])).toEqual(STORY);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['stories'] });
  });

  it('cancels immediately and ignores a late obsolete success', async () => {
    const pending = deferred<Story>();
    jest.mocked(generateStory).mockReturnValue(pending.promise);
    await renderProvider();

    await act(async () => {
      context.startGeneration(SNAPSHOT);
    });
    const signal = jest.mocked(generateStory).mock.calls[0][6]!;

    await act(async () => {
      context.cancelGeneration();
      context.cancelGeneration();
    });
    expect(signal.aborted).toBe(true);
    expect(context.state).toEqual({ status: 'idle' });

    await act(async () => {
      pending.resolve(STORY);
    });
    expect(context.state).toEqual({ status: 'idle' });
  });

  it('retries a failed request with its original snapshot and retains background intent', async () => {
    const first = deferred<Story>();
    jest.mocked(generateStory)
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(STORY);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await renderProvider();

    await act(async () => {
      context.startGeneration(SNAPSHOT);
      context.continueInBackground();
    });
    await act(async () => {
      first.reject(new Error('network'));
    });

    expect(context.state).toMatchObject({ status: 'failed', snapshot: SNAPSHOT, hasLeftGenerationScreen: true });
    await act(async () => {
      expect(context.retryGeneration()).toEqual({ status: 'started' });
    });

    expect(generateStory).toHaveBeenLastCalledWith(
      'child-1',
      'barnaby',
      'Mia',
      'preschool',
      'bedtime',
      'refusing_teeth',
      expect.any(AbortSignal),
    );
    expect(context.state).toMatchObject({ status: 'ready', snapshot: SNAPSHOT, hasLeftGenerationScreen: true });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('atomically takes a ready story and starts each new provider at idle', async () => {
    jest.mocked(generateStory).mockResolvedValue(STORY);
    const first = await renderProvider();

    await act(async () => {
      context.startGeneration(SNAPSHOT);
    });
    await act(async () => {
      expect(context.takeReadyStory()).toEqual(STORY);
      expect(context.takeReadyStory()).toBeNull();
    });
    expect(context.state).toEqual({ status: 'idle' });

    await first.unmount();
    const second = await renderProvider();
    expect(second.getByTestId('state').props.children).toBe('idle');
  });
});

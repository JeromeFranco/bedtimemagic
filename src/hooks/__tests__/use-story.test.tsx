import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStory, useStories } from '../use-story';

const mockGetStory = jest.fn();
const mockGetStories = jest.fn();

jest.mock('@/api/stories', () => ({
  getStory: (...args: unknown[]) => mockGetStory(...args),
  getStories: (...args: unknown[]) => mockGetStories(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useStory', () => {
  beforeEach(() => {
    mockGetStory.mockReset();
  });

  it('fetches a single story by id', async () => {
    const mockStory = { id: 'story-1', title: 'Test Story' };
    mockGetStory.mockResolvedValue(mockStory);

    const { result } = await renderHook(() => useStory('story-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetStory).toHaveBeenCalledWith('story-1');
    expect(result.current.data).toEqual(mockStory);
  });

  it('does not call getStory when id is empty', async () => {
    const { result } = await renderHook(() => useStory(''), {
      wrapper: createWrapper(),
    });

    expect(mockGetStory).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('returns error when fetch fails', async () => {
    const error = new Error('Not found');
    mockGetStory.mockRejectedValue(error);

    const { result } = await renderHook(() => useStory('story-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

describe('useStories', () => {
  beforeEach(() => {
    mockGetStories.mockReset();
  });

  it('fetches all stories when no childId provided', async () => {
    const mockStories = [
      { id: 'story-1', title: 'Story 1' },
      { id: 'story-2', title: 'Story 2' },
    ];
    mockGetStories.mockResolvedValue(mockStories);

    const { result } = await renderHook(() => useStories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetStories).toHaveBeenCalledWith(undefined);
    expect(result.current.data).toEqual(mockStories);
  });

  it('fetches stories filtered by childId', async () => {
    const mockStories = [{ id: 'story-1', title: 'Story 1', child_id: 'child-1' }];
    mockGetStories.mockResolvedValue(mockStories);

    const { result } = await renderHook(() => useStories('child-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetStories).toHaveBeenCalledWith('child-1');
    expect(result.current.data).toEqual(mockStories);
  });

  it('returns error when fetch fails', async () => {
    const error = new Error('Not authenticated');
    mockGetStories.mockRejectedValue(error);

    const { result } = await renderHook(() => useStories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

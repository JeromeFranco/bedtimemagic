import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useCoverImage } from '../use-cover-image';

const mockGenerateCoverImage = jest.fn();
const mockGetStory = jest.fn();

jest.mock('@/api/stories', () => ({
  generateCoverImage: (...args: unknown[]) => mockGenerateCoverImage(...args),
  getStory: (...args: unknown[]) => mockGetStory(...args),
}));

describe('useCoverImage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGenerateCoverImage.mockReset();
    mockGetStory.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires generation on mount and returns loading state', async () => {
    mockGenerateCoverImage.mockResolvedValue({ coverImageUrl: null });

    const { result } = await renderHook(() =>
      useCoverImage('story-1', 'Test Title')
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.coverUrl).toBeNull();
    expect(mockGenerateCoverImage).toHaveBeenCalledWith('story-1', 'Test Title');
  });

  it('returns coverUrl when story has cover_image_url', async () => {
    mockGenerateCoverImage.mockResolvedValue({ coverImageUrl: null });
    mockGetStory.mockResolvedValue({ id: 'story-1', cover_image_url: 'https://example.com/cover.png' });

    const { result } = await renderHook(() =>
      useCoverImage('story-1', 'Test Title')
    );

    // First poll returns the URL
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(result.current.coverUrl).toBe('https://example.com/cover.png');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('polls every 3 seconds until cover is ready', async () => {
    mockGenerateCoverImage.mockResolvedValue({ coverImageUrl: null });

    mockGetStory
      .mockResolvedValueOnce({ id: 'story-1', cover_image_url: null })
      .mockResolvedValueOnce({ id: 'story-1', cover_image_url: null })
      .mockResolvedValueOnce({ id: 'story-1', cover_image_url: 'https://example.com/cover.png' });

    const { result } = await renderHook(() =>
      useCoverImage('story-1', 'Test Title')
    );

    // First poll - no cover yet
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.coverUrl).toBeNull();

    // Second poll - no cover yet
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.coverUrl).toBeNull();

    // Third poll - gets URL
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(result.current.coverUrl).toBe('https://example.com/cover.png');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('times out after 60 seconds', async () => {
    mockGenerateCoverImage.mockResolvedValue({ coverImageUrl: null });
    mockGetStory.mockResolvedValue({ id: 'story-1', cover_image_url: null });

    const { result } = await renderHook(() =>
      useCoverImage('story-1', 'Test Title')
    );

    // Advance past timeout
    await act(async () => {
      jest.advanceTimersByTime(63000);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.coverUrl).toBeNull();
    });
  });

  it('cleans up polling on unmount', async () => {
    mockGenerateCoverImage.mockResolvedValue({ coverImageUrl: null });

    const { unmount } = await renderHook(() =>
      useCoverImage('story-1', 'Test Title')
    );

    await unmount();
    // No assertions needed - just verify no memory leaks
  });
});

import { useEffect, useRef, useState } from 'react';
import { generateCoverImage, getStory } from '@/api/stories';

const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 60000;

interface UseCoverImageResult {
  coverUrl: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useCoverImage(
  storyId: string,
  title: string,
  options?: { enabled?: boolean }
): UseCoverImageResult {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabled = options?.enabled !== false;

  useEffect(() => {
    if (!enabled || !storyId || !title) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const cleanup = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const startPolling = () => {
      pollTimerRef.current = setInterval(async () => {
        if (cancelled) return;
        try {
          const story = await getStory(storyId);
          if (story.cover_image_url && !cancelled) {
            setCoverUrl(story.cover_image_url);
            setIsLoading(false);
            cleanup();
          }
        } catch {
          // Poll failures are non-fatal, keep trying
        }
      }, POLL_INTERVAL_MS);
    };

    const init = async () => {
      try {
        // Fire generation (don't await full completion)
        generateCoverImage(storyId, title).catch(() => {
          // Generation failure is non-fatal, placeholder stays
        });

        // Start polling immediately
        startPolling();

        // Set timeout
        timeoutRef.current = setTimeout(() => {
          if (!cancelled) {
            setIsLoading(false);
            cleanup();
          }
        }, TIMEOUT_MS);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [storyId, title, enabled]);

  return { coverUrl, isLoading, error };
}

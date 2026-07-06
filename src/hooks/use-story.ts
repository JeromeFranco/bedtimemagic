import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getStory, getStories } from '@/api/stories';
import type { Story } from '@/types';

export function useStory(id: string): UseQueryResult<Story> {
  return useQuery({
    queryKey: ['story', id],
    queryFn: () => getStory(id),
    staleTime: 1000 * 60 * 5,
  });
}

export function useStories(childId?: string): UseQueryResult<Story[]> {
  return useQuery({
    queryKey: ['stories', childId],
    queryFn: () => getStories(childId),
    staleTime: 1000 * 60 * 5,
  });
}

import { supabase } from '@/lib/supabase';
import type { Story, Challenge, Protagonist, StoryRating } from '@/types';

export async function getStories(childId?: string): Promise<Story[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('stories')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (childId) {
    query = query.eq('child_id', childId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function generateStory(
  childId: string,
  protagonist: Protagonist,
  challenge: Challenge,
  customInput?: string
): Promise<Story> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('generate-story', {
    body: { childId, protagonist, challenge, customInput },
  });

  if (error) throw error;
  return data;
}

export async function logStoryRating(
  storyId: string,
  childId: string,
  rating: StoryRating
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('lesson_logs')
    .insert({
      user_id: user.id,
      story_id: storyId,
      child_id: childId,
      rating,
    });

  if (error) throw error;
}

import { supabase } from '@/lib/supabase';
import type { Story, ChallengeTrigger, ChallengeCategory, Protagonist, DevelopmentalStage, StoryRating } from '@/types';

export async function getStory(storyId: string): Promise<Story> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  return data;
}

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
  childNickname: string,
  developmentalStage: DevelopmentalStage,
  tier1Challenge: ChallengeCategory,
  tier2Trigger: ChallengeTrigger
): Promise<Story> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('generate-story', {
    body: {
      childId,
      protagonistId: protagonist,
      childNickname,
      developmentalStage,
      tier1Challenge,
      tier2Trigger,
    },
  });

  if (error) throw error;
  return data;
}

export async function generateCoverImage(
  storyId: string,
  title: string
): Promise<{ coverImageUrl: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('generate-cover-image', {
    body: { storyId, title },
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

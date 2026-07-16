import { writeAudioToCache, enforceFifoEviction } from './audio-cache';
import { supabase } from './supabase';

export async function fetchStoryAudio(storyId: string, storyText: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('EXPO_PUBLIC_SUPABASE_URL not configured');

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-story-audio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ story_text: storyText }),
  });

  if (!response.ok) {
    throw new Error(`Edge function returned ${response.status}`);
  }

  const data = await response.json();
  if (!data.audio) {
    throw new Error('No audio data in response');
  }

  const path = await writeAudioToCache(storyId, data.audio);
  await enforceFifoEviction();
  return path;
}

import { writeSentenceToCache, finalizeAudioCache, enforceFifoEviction } from './audio-cache';
import { supabase } from './supabase';

export async function streamStoryAudio(storyId: string, storyText: string, maxSentences?: number): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('EXPO_PUBLIC_SUPABASE_URL not configured');

  const body: Record<string, unknown> = { story_text: storyText };
  if (maxSentences !== undefined) {
    body.max_sentences = maxSentences;
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-story-audio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Edge function returned ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Response body is null — streaming not supported');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let eventType = '';
  let data = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!;

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7);
        } else if (line.startsWith('data: ')) {
          data = line.slice(6);
        } else if (line === '') {
          if (eventType === 'sentence') {
            const parsed = JSON.parse(data);
            await writeSentenceToCache(storyId, parsed.index, parsed.audio);
          } else if (eventType === 'sentence-error') {
            const parsed = JSON.parse(data);
            console.warn(`Sentence ${parsed.index} TTS failed: ${parsed.message}`);
          } else if (eventType === 'done') {
            await enforceFifoEviction();
            return await finalizeAudioCache(storyId);
          } else if (eventType === 'error') {
            const parsed = JSON.parse(data);
            throw new Error(parsed.message);
          }
          eventType = '';
          data = '';
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  throw new Error('Stream ended without done event');
}

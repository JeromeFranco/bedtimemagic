import { writeAudioChunk, finalizeAudioCache, enforceFifoEviction, discardPendingChunks } from './audio-cache';
import { supabase } from './supabase';

export async function streamStoryAudio(storyId: string, storyText: string): Promise<string> {
  const supabaseAny = supabase as unknown as Record<string, unknown>;
  const supabaseUrl = supabaseAny.supabaseUrl as string;
  const supabaseKey = supabaseAny.supabaseKey as string;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL or key not available');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-story-audio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ story_text: storyText }),
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
          if (eventType === 'chunk') {
            const parsed = JSON.parse(data);
            await writeAudioChunk(storyId, parsed.audio);
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
  } catch (error) {
    discardPendingChunks(storyId);
    throw error;
  } finally {
    reader.releaseLock();
  }

  throw new Error('Stream ended without done event');
}

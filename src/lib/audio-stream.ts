import { writeAudioChunk, finalizeAudioCache, enforceFifoEviction } from './audio-cache';
import { supabase } from './supabase';

export async function streamStoryAudio(storyId: string, storyText: string): Promise<string> {
  const { supabaseUrl, supabaseKey } = supabase as unknown as {
    supabaseUrl: string;
    supabaseKey: string;
  };

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-story-audio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ storyId, storyText }),
  });

  if (!response.ok) {
    throw new Error(`Edge function returned ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let eventType = '';
  let data = '';
  let gotDone = false;
  let buffer = '';

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
          gotDone = true;
          await enforceFifoEviction();
          return finalizeAudioCache(storyId);
        } else if (eventType === 'error') {
          const parsed = JSON.parse(data);
          throw new Error(parsed.message);
        }
        eventType = '';
        data = '';
      }
    }
  }

  if (!gotDone) {
    throw new Error('Stream ended without done event');
  }

  return finalizeAudioCache(storyId);
}

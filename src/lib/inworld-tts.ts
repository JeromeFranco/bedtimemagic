import { InworldTTS } from '@inworld/tts';
import type { InworldTTSClient } from '@inworld/tts';
import {
  getCachedAudioSegmentPath,
  writeAudioSegmentToCache,
  enforceFifoEviction,
} from './audio-cache';
import { splitStoryIntoSegments } from './story-segments';
import { supabase } from './supabase';

export interface StoryAudioSegment {
  storyId: string;
  segmentIndex: number;
  text: string;
  uri: string;
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let ttsClient: InworldTTSClient | null = null;
let tokenPromise: Promise<{ token: string; expiresAt: number }> | null = null;

async function getInworldToken(): Promise<{ token: string; expiresAt: number }> {
  if (tokenPromise) return tokenPromise;

  tokenPromise = (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('generate-inworld-token');
    if (error || !data?.token) {
      throw new Error(error?.message ?? 'Failed to get Inworld token');
    }

    cachedToken = data.token;
    tokenExpiresAt = data.expiresAt ?? Date.now() + 3_600_000;
    return { token: cachedToken!, expiresAt: tokenExpiresAt };
  })();

  try {
    return await tokenPromise;
  } finally {
    tokenPromise = null;
  }
}

function getOrCreateTTSClient(): InworldTTSClient {
  if (!ttsClient) {
    ttsClient = InworldTTS({
      token: cachedToken!,
      onTokenExpiring: async () => {
        const { token } = await getInworldToken();
        return token;
      },
    });
  }
  return ttsClient;
}

export async function streamStorySegment(
  storyId: string,
  segmentIndex: number,
  text: string,
): Promise<StoryAudioSegment> {
  const cached = await getCachedAudioSegmentPath(storyId, segmentIndex);
  if (cached) {
    return { storyId, segmentIndex, text, uri: cached };
  }

  await getInworldToken();
  const tts = getOrCreateTTSClient();

  const chunks: Uint8Array[] = [];
  for await (const chunk of tts.stream({
    text,
    voice: 'Ashley',
    model: 'inworld-tts-1.5-mini',
    encoding: 'MP3',
  })) {
    chunks.push(new Uint8Array(chunk));
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  const uri = await writeAudioSegmentToCache(storyId, segmentIndex, merged);
  await enforceFifoEviction();

  return { storyId, segmentIndex, text, uri };
}

const inflightPrefetches = new Map<string, Promise<void>>();

export async function prefetchStoryAudio(
  storyId: string,
  storyText: string,
): Promise<void> {
  const existing = inflightPrefetches.get(storyId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const segments = splitStoryIntoSegments(storyText);

      for (let i = 0; i < segments.length; i++) {
        await streamStorySegment(storyId, i, segments[i]);
      }
    } finally {
      inflightPrefetches.delete(storyId);
    }
  })();

  inflightPrefetches.set(storyId, promise);
  return promise;
}

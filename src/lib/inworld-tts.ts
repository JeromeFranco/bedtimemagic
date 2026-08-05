import { InworldTTS } from '@inworld/tts';
import type { InworldTTSClient } from '@inworld/tts';
import {
  getCachedAudioSegmentPath,
  AudioSegmentWriter,
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

export function resetTokenCache(): void {
  cachedToken = null;
  tokenExpiresAt = 0;
  ttsClient = null;
  tokenPromise = null;
}

async function getInworldToken(): Promise<{ token: string; expiresAt: number }> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return { token: cachedToken, expiresAt: tokenExpiresAt };
  }

  if (tokenPromise) return tokenPromise;

  tokenPromise = (async () => {
    if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
      return { token: cachedToken, expiresAt: tokenExpiresAt };
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('generate-inworld-token');
    if (error || !data?.token) {
      throw new Error(error?.message ?? 'Failed to get Inworld token');
    }

    cachedToken = data.token;
    tokenExpiresAt = data.expirationTime
      ? new Date(data.expirationTime).getTime()
      : Date.now() + 3_600_000;
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

const inflightSegments = new Map<string, Promise<StoryAudioSegment>>();

export async function streamStorySegment(
  storyId: string,
  segmentIndex: number,
  text: string,
): Promise<StoryAudioSegment> {
  const cached = await getCachedAudioSegmentPath(storyId, segmentIndex);
  if (cached) {
    return { storyId, segmentIndex, text, uri: cached };
  }

  const dedupeKey = `${storyId}:${segmentIndex}`;
  const existing = inflightSegments.get(dedupeKey);
  if (existing) return existing;

  const promise = (async () => {
    try {
      await getInworldToken();
      const tts = getOrCreateTTSClient();

      const writer = new AudioSegmentWriter(storyId, segmentIndex);
      try {
        for await (const chunk of tts.stream({
          text,
          voice: 'Ashley',
          model: 'inworld-tts-1.5-mini',
          encoding: 'MP3',
        })) {
          writer.write(chunk);
        }

        const uri = await writer.finish();
        await enforceFifoEviction();

        return { storyId, segmentIndex, text, uri };
      } catch (error) {
        // never leave a truncated .part file behind on failure
        writer.abort();
        throw error;
      }
    } finally {
      inflightSegments.delete(dedupeKey);
    }
  })();

  inflightSegments.set(dedupeKey, promise);
  return promise;
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

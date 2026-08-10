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

export class CancelledError extends Error {
  constructor(storyId: string) {
    super(`Audio streaming for story ${storyId} was cancelled`);
    this.name = 'CancelledError';
  }
}

const MAX_SEGMENT_ATTEMPTS = 2;
const RETRY_DELAY_MS = 600;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
const activeStreams = new Map<string, AsyncGenerator<Uint8Array>>();
const cancelCounters = new Map<string, number>();

/**
 * Cancels all in-flight TTS streams for a story. Best-effort termination:
 * the SDK exposes no AbortSignal, so the underlying fetch cannot be
 * aborted — at most one extra chunk arrives before the generator
 * terminates. Cancelled promises reject with CancelledError and are
 * removed from the dedupe map, so a later replay regenerates cleanly.
 */
export function cancelStoryAudio(storyId: string): void {
  cancelCounters.set(storyId, (cancelCounters.get(storyId) ?? 0) + 1);
  for (const [key, stream] of activeStreams) {
    if (key.startsWith(`${storyId}:`)) {
      void stream.return(undefined);
    }
  }
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

  const dedupeKey = `${storyId}:${segmentIndex}`;
  const existing = inflightSegments.get(dedupeKey);
  if (existing) return existing;

  const cancelAtStart = cancelCounters.get(storyId) ?? 0;

  const promise = (async () => {
    try {
      await getInworldToken();
      const tts = getOrCreateTTSClient();
      const writer = new AudioSegmentWriter(storyId, segmentIndex);

      let lastError: unknown = null;
      // The SDK already retries request-start NetworkError/5xx internally
      // (maxRetries: 2), so this loop only covers mid-stream failures.
      for (let attempt = 1; attempt <= MAX_SEGMENT_ATTEMPTS; attempt++) {
        if (attempt > 1) {
          await delay(RETRY_DELAY_MS);
        }
        // drop any partial .part file from a failed attempt
        writer.abort();
        if ((cancelCounters.get(storyId) ?? 0) !== cancelAtStart) {
          throw new CancelledError(storyId);
        }

        try {
          const stream = tts.stream({
            text,
            voice: 'Ashley',
            model: 'inworld-tts-1.5-mini',
            encoding: 'MP3',
            speakingRate: 0.9,
            temperature: 1.0,
          });
          activeStreams.set(dedupeKey, stream);
          for await (const chunk of stream) {
            writer.write(chunk);
          }

          if ((cancelCounters.get(storyId) ?? 0) !== cancelAtStart) {
            writer.abort();
            throw new CancelledError(storyId);
          }

          const uri = await writer.finish();
          await enforceFifoEviction();
          return { storyId, segmentIndex, text, uri };
        } catch (error) {
          if (error instanceof CancelledError) {
            throw error;
          }
          lastError = error;
        } finally {
          activeStreams.delete(dedupeKey);
        }
      }

      writer.abort();
      throw lastError instanceof Error ? lastError : new Error('TTS streaming failed');
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
      const cancelAtStart = cancelCounters.get(storyId) ?? 0;

      for (let i = 0; i < segments.length; i++) {
        // stop queueing further segments once the story was cancelled
        if ((cancelCounters.get(storyId) ?? 0) !== cancelAtStart) return;
        await streamStorySegment(storyId, i, segments[i]);
      }
    } finally {
      inflightPrefetches.delete(storyId);
    }
  })();

  inflightPrefetches.set(storyId, promise);
  return promise;
}

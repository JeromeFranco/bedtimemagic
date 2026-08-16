import type { InworldTTSClient } from '@inworld/tts';
import { InworldTTS } from '@inworld/tts';
import {
  AudioSegmentWriter,
  enforceFifoEviction,
  getCachedAudioSegmentPath,
} from './audio-cache';
import { invokeEdgeFunction } from './invoke-edge-function';
import { categorizeError, createOperationId, emitObservabilityEvent, startDuration } from './observability';
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
let tokenPromise: { promise: Promise<{ token: string; expiresAt: number }>; operationId: string } | null = null;

export function resetTokenCache(): void {
  cachedToken = null;
  tokenExpiresAt = 0;
  ttsClient = null;
  tokenPromise = null;
}

async function getInworldToken(parentOperationId?: string): Promise<{ token: string; expiresAt: number }> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    emitObservabilityEvent('tts.token.cache_hit', { operationId: createOperationId(), parentOperationId, cacheState: 'hit' });
    return { token: cachedToken, expiresAt: tokenExpiresAt };
  }

  if (tokenPromise) return tokenPromise.promise;

  const operationId = createOperationId();
  const duration = startDuration();
  emitObservabilityEvent('tts.token.refresh_started', { operationId, parentOperationId, cacheState: 'refresh' });
  const promise = (async () => {
    if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
      return { token: cachedToken, expiresAt: tokenExpiresAt };
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const data = await invokeEdgeFunction('generate-inworld-token');
    if (!data?.token) {
      throw new Error('Failed to get Inworld token');
    }

    cachedToken = data.token;
    tokenExpiresAt = data.expirationTime
      ? new Date(data.expirationTime).getTime()
      : Date.now() + 3_600_000;
    emitObservabilityEvent('tts.token.refresh_succeeded', { operationId, parentOperationId, cacheState: 'refresh', durationMs: duration() });
    return { token: cachedToken!, expiresAt: tokenExpiresAt };
  })();
  tokenPromise = { promise, operationId };

  try {
    return await promise;
  } catch (error) {
    emitObservabilityEvent('tts.token.refresh_failed', { operationId, parentOperationId, cacheState: 'refresh', durationMs: duration(), errorKind: categorizeError(error).errorKind });
    throw error;
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

const inflightSegments = new Map<string, { promise: Promise<StoryAudioSegment>; operationId: string }>();
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
  context: { parentOperationId?: string; segmentCount?: number } = {},
): Promise<StoryAudioSegment> {
  const cached = await getCachedAudioSegmentPath(storyId, segmentIndex);
  if (cached) {
    emitObservabilityEvent('tts.segment.cache_hit', { operationId: createOperationId(), parentOperationId: context.parentOperationId, segmentIndex, segmentCount: context.segmentCount, attempt: 1 });
    return { storyId, segmentIndex, text, uri: cached };
  }

  const dedupeKey = `${storyId}:${segmentIndex}`;
  const existing = inflightSegments.get(dedupeKey);
  if (existing) {
    emitObservabilityEvent('tts.segment.deduplicated', { operationId: existing.operationId, parentOperationId: context.parentOperationId, segmentIndex, segmentCount: context.segmentCount, attempt: 1 });
    return existing.promise;
  }

  const cancelAtStart = cancelCounters.get(storyId) ?? 0;

  const operationId = createOperationId();
  const duration = startDuration();
  emitObservabilityEvent('tts.segment.started', { operationId, parentOperationId: context.parentOperationId, segmentIndex, segmentCount: context.segmentCount, attempt: 1 });
  const promise = (async () => {
    try {
      await getInworldToken(context.parentOperationId);
      const tts = getOrCreateTTSClient();
      const writer = new AudioSegmentWriter(storyId, segmentIndex);

      let lastError: unknown = null;
      // The SDK already retries request-start NetworkError/5xx internally
      // (maxRetries: 2), so this loop only covers mid-stream failures.
      for (let attempt = 1; attempt <= MAX_SEGMENT_ATTEMPTS; attempt++) {
        if (attempt > 1) {
          emitObservabilityEvent('tts.segment.retrying', { operationId, parentOperationId: context.parentOperationId, segmentIndex, segmentCount: context.segmentCount, attempt, errorKind: categorizeError(lastError).errorKind });
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
          emitObservabilityEvent('tts.segment.succeeded', { operationId, parentOperationId: context.parentOperationId, segmentIndex, segmentCount: context.segmentCount, attempt, durationMs: duration(), bytesWritten: writer.bytesWritten });
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
    } catch (error) {
      if (error instanceof CancelledError) emitObservabilityEvent('tts.segment.cancelled', { operationId, parentOperationId: context.parentOperationId, segmentIndex, segmentCount: context.segmentCount, attempt: 1, durationMs: duration() });
      else emitObservabilityEvent('tts.segment.failed', { operationId, parentOperationId: context.parentOperationId, segmentIndex, segmentCount: context.segmentCount, attempt: MAX_SEGMENT_ATTEMPTS, durationMs: duration(), errorKind: categorizeError(error).errorKind });
      throw error;
    } finally {
      inflightSegments.delete(dedupeKey);
    }
  })();

  inflightSegments.set(dedupeKey, { promise, operationId });
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
    const operationId = createOperationId();
    const duration = startDuration();
    let segments: string[] = [];
    try {
      segments = splitStoryIntoSegments(storyText);
      emitObservabilityEvent('tts.prefetch.started', { operationId, segmentCount: segments.length });
      const cancelAtStart = cancelCounters.get(storyId) ?? 0;

      for (let i = 0; i < segments.length; i++) {
        // stop queueing further segments once the story was cancelled
        if ((cancelCounters.get(storyId) ?? 0) !== cancelAtStart) { emitObservabilityEvent('tts.prefetch.cancelled', { operationId, segmentCount: segments.length, durationMs: duration() }); return; }
        await streamStorySegment(storyId, i, segments[i], { parentOperationId: operationId, segmentCount: segments.length });
      }
      emitObservabilityEvent('tts.prefetch.succeeded', { operationId, segmentCount: segments.length, durationMs: duration() });
    } catch (error) {
      if (error instanceof CancelledError) emitObservabilityEvent('tts.prefetch.cancelled', { operationId, segmentCount: segments.length, durationMs: duration() });
      else emitObservabilityEvent('tts.prefetch.failed', { operationId, segmentCount: segments.length, durationMs: duration(), errorKind: categorizeError(error).errorKind });
      throw error;
    } finally {
      inflightPrefetches.delete(storyId);
    }
  })();

  inflightPrefetches.set(storyId, promise);
  return promise;
}

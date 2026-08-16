import { getCachedAudioSegmentPaths } from './audio-cache';
import { streamStorySegment, prefetchStoryAudio } from './inworld-tts';
import { createOperationId } from './observability';

export { prefetchStoryAudio };

export async function getSegmentAudioSources(
  storyId: string,
  segmentCount: number,
  segmentTexts?: string[],
): Promise<{ uri: string }[]> {
  const cachedPaths = await getCachedAudioSegmentPaths(storyId, segmentCount);
  const parentOperationId = createOperationId();

  const results: { uri: string }[] = [];
  for (let i = 0; i < segmentCount; i++) {
    if (cachedPaths[i]) {
      results.push({ uri: cachedPaths[i]! });
    } else if (segmentTexts?.[i]) {
      const segment = await streamStorySegment(storyId, i, segmentTexts[i], { parentOperationId, segmentCount });
      results.push({ uri: segment.uri });
    } else {
      throw new Error(`Missing cached segment ${i} and no text provided for streaming`);
    }
  }

  return results;
}

const inflightPrefetches = new Map<string, Promise<void>>();

export async function preFetchAudio(
  storyId: string,
  storyText: string,
): Promise<void> {
  const existing = inflightPrefetches.get(storyId);
  if (existing) return existing;

  const promise = prefetchStoryAudio(storyId, storyText).finally(() =>
    inflightPrefetches.delete(storyId),
  );
  inflightPrefetches.set(storyId, promise);
  return promise;
}

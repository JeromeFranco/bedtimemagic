import { getCachedAudioPath, getCachedAudioSegmentPaths } from './audio-cache';
import { getSegmentAudioSources, preFetchAudio as streamPreFetchAudio } from './audio-stream';
import { splitStoryIntoSegments } from './story-segments';
import type { Story } from '@/types';

const SAMPLE_AUDIO = require('../../assets/audio/sample-story.mp3');
const AMBIENT_RAIN = require('../../assets/audio/ambient-rain.mp3');

export { streamPreFetchAudio as preFetchAudio };

export async function getAudioSource(story: Story): Promise<{ uri: string }> {
  const segments = splitStoryIntoSegments(story.story_text);
  const segmentCount = segments.length;

  const cachedPaths = await getCachedAudioSegmentPaths(story.id, segmentCount);
  const allCached = cachedPaths.every((p) => p !== null);

  if (allCached && cachedPaths.length > 0) {
    return { uri: cachedPaths[0]! };
  }

  if (cachedPaths.length === 0) {
    const legacyPath = await getCachedAudioPath(story.id);
    if (legacyPath) return { uri: legacyPath };
  }

  const sources = await getSegmentAudioSources(story.id, segmentCount, segments);
  return sources[0];
}

export function getAmbientAudioSource(): { uri: string } {
  return { uri: AMBIENT_RAIN };
}

export function getSampleAudioSource(): { uri: string } {
  return { uri: SAMPLE_AUDIO };
}

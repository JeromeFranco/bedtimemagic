import { getCachedAudioPath } from './audio-cache';
import { streamStoryAudio } from './audio-stream';
import type { Story } from '@/types';

const SAMPLE_AUDIO = require('../../assets/audio/sample-story.mp3');
const AMBIENT_RAIN = require('../../assets/audio/ambient-rain.mp3');

const inflightPrefetches = new Map<string, Promise<string>>();

export async function preFetchAudio(
  storyId: string,
  storyText: string,
  maxSentences: number = 2
): Promise<string> {
  const existing = inflightPrefetches.get(storyId);
  if (existing) return existing;

  const promise = streamStoryAudio(storyId, storyText, maxSentences)
    .finally(() => inflightPrefetches.delete(storyId));
  inflightPrefetches.set(storyId, promise);
  return promise;
}

export async function getAudioSource(story: Story): Promise<{ uri: string }> {
  const inflight = inflightPrefetches.get(story.id);
  if (inflight) {
    const path = await inflight;
    return { uri: path };
  }

  const cachedPath = await getCachedAudioPath(story.id);
  if (cachedPath) {
    return { uri: cachedPath };
  }
  const localPath = await streamStoryAudio(story.id, story.story_text);
  return { uri: localPath };
}

export function getSampleAudioSource(): { uri: string } {
  return { uri: SAMPLE_AUDIO };
}

export function getAmbientAudioSource(): { uri: string } {
  return { uri: AMBIENT_RAIN };
}

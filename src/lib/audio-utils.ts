import { getCachedAudioPath } from './audio-cache';
import { streamStoryAudio } from './audio-stream';
import type { Story } from '@/types';

const SAMPLE_AUDIO = require('../../assets/audio/sample-story.mp3');
const AMBIENT_RAIN = require('../../assets/audio/ambient-rain.mp3');

export async function getAudioSource(story: Story): Promise<{ uri: string }> {
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

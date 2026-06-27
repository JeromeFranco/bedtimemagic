import type { Story } from '@/types';

const SAMPLE_AUDIO = require('../../assets/audio/sample-story.mp3');
const AMBIENT_RAIN = require('../../assets/audio/ambient-rain.mp3');

export function getAudioSource(story: Story): { uri: string } {
  return { uri: SAMPLE_AUDIO };
}

export function getAmbientAudioSource() {
  return AMBIENT_RAIN;
}

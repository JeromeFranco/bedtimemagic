import { getAudioSource } from '../audio-utils';
import type { Story } from '@/types';

const MOCK_STORY: Story = {
  id: 'story-1',
  user_id: 'user-1',
  child_id: 'child-1',
  title: 'Test Story',
  story_text: 'Once upon a time...',
  moral: 'Be kind.',
  pillow_talk_prompt: 'What was your favorite part?',
  sleepy_affirmation: 'I am brave.',
  cover_image_url: null,
  challenge: 'refusing_teeth',
  protagonist: 'barnaby',
  created_at: '2026-06-21T00:00:00Z',
};

describe('getAudioSource', () => {
  it('returns an object with uri property', () => {
    const source = getAudioSource(MOCK_STORY);
    expect(source).toHaveProperty('uri');
    expect(source.uri).toBeDefined();
  });

  it('returns consistent source for same story', () => {
    const source1 = getAudioSource(MOCK_STORY);
    const source2 = getAudioSource(MOCK_STORY);
    expect(source1).toEqual(source2);
  });

  it('returns same mock URI regardless of story', () => {
    const source1 = getAudioSource(MOCK_STORY);
    const source2 = getAudioSource({ ...MOCK_STORY, id: 'story-2' });
    expect(source1.uri).toBe(source2.uri);
  });
});

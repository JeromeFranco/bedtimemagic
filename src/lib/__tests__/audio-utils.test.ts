jest.mock('../audio-cache', () => ({
  getCachedAudioPath: jest.fn(),
}));

jest.mock('../audio-stream', () => ({
  streamStoryAudio: jest.fn(),
}));

jest.mock('../../../assets/audio/sample-story.mp3', () => 'mocked-sample.mp3', { virtual: true });
jest.mock('../../../assets/audio/ambient-rain.mp3', () => 'mocked-ambient.mp3', { virtual: true });

import { getCachedAudioPath } from '../audio-cache';
import { streamStoryAudio } from '../audio-stream';
import { getAudioSource, getAmbientAudioSource, preFetchAudio } from '../audio-utils';
import type { Story } from '@/types';

const mockedGetCachedAudioPath = getCachedAudioPath as jest.Mock;
const mockedStreamStoryAudio = streamStoryAudio as jest.Mock;

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getAudioSource', () => {
  it('returns cached path on cache hit without streaming', async () => {
    mockedGetCachedAudioPath.mockResolvedValue('/cache/audio_story-1.wav');

    const source = await getAudioSource(MOCK_STORY);

    expect(source).toEqual({ uri: '/cache/audio_story-1.wav' });
    expect(mockedGetCachedAudioPath).toHaveBeenCalledWith('story-1');
    expect(mockedStreamStoryAudio).not.toHaveBeenCalled();
  });

  it('streams from server on cache miss', async () => {
    mockedGetCachedAudioPath.mockResolvedValue(null);
    mockedStreamStoryAudio.mockResolvedValue('/cache/audio_story-1.wav');

    const source = await getAudioSource(MOCK_STORY);

    expect(source).toEqual({ uri: '/cache/audio_story-1.wav' });
    expect(mockedGetCachedAudioPath).toHaveBeenCalledWith('story-1');
    expect(mockedStreamStoryAudio).toHaveBeenCalledWith('story-1', 'Once upon a time...');
  });
});

describe('getAmbientAudioSource', () => {
  it('returns ambient rain source', () => {
    const source = getAmbientAudioSource();
    expect(source).toEqual({ uri: 'mocked-ambient.mp3' });
  });
});

describe('preFetchAudio', () => {
  it('calls streamStoryAudio with max_sentences', async () => {
    mockedStreamStoryAudio.mockResolvedValue('/cache/audio_story-1.wav');

    await preFetchAudio('story-1', 'Hello world', 2);

    expect(mockedStreamStoryAudio).toHaveBeenCalledWith('story-1', 'Hello world', 2);
  });

  it('defaults max_sentences to 2', async () => {
    mockedStreamStoryAudio.mockResolvedValue('/cache/audio_story-1.wav');

    await preFetchAudio('story-1', 'Hello world');

    expect(mockedStreamStoryAudio).toHaveBeenCalledWith('story-1', 'Hello world', 2);
  });
});

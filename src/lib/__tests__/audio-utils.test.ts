jest.mock('../audio-cache', () => ({
  getCachedAudioPath: jest.fn(),
}));

jest.mock('../audio-stream', () => ({
  fetchStoryAudio: jest.fn(),
}));

jest.mock('../../../assets/audio/sample-story.mp3', () => 'mocked-sample.mp3', { virtual: true });
jest.mock('../../../assets/audio/ambient-rain.mp3', () => 'mocked-ambient.mp3', { virtual: true });

import { getCachedAudioPath } from '../audio-cache';
import { fetchStoryAudio } from '../audio-stream';
import { getAudioSource, getAmbientAudioSource, preFetchAudio } from '../audio-utils';
import type { Story } from '@/types';

const mockedGetCachedAudioPath = getCachedAudioPath as jest.Mock;
const mockedFetchStoryAudio = fetchStoryAudio as jest.Mock;

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
  it('returns cached path on cache hit without fetching', async () => {
    mockedGetCachedAudioPath.mockResolvedValue('/cache/audio_story-1.mp3');

    const source = await getAudioSource(MOCK_STORY);

    expect(source).toEqual({ uri: '/cache/audio_story-1.mp3' });
    expect(mockedGetCachedAudioPath).toHaveBeenCalledWith('story-1');
    expect(mockedFetchStoryAudio).not.toHaveBeenCalled();
  });

  it('fetches from server on cache miss', async () => {
    mockedGetCachedAudioPath.mockResolvedValue(null);
    mockedFetchStoryAudio.mockResolvedValue('/cache/audio_story-1.mp3');

    const source = await getAudioSource(MOCK_STORY);

    expect(source).toEqual({ uri: '/cache/audio_story-1.mp3' });
    expect(mockedGetCachedAudioPath).toHaveBeenCalledWith('story-1');
    expect(mockedFetchStoryAudio).toHaveBeenCalledWith('story-1', 'Once upon a time...');
  });

  it('waits for inflight pre-fetch instead of starting a new fetch', async () => {
    let resolveFetch!: (value: string) => void;
    mockedFetchStoryAudio.mockImplementation(
      () => new Promise<string>((resolve) => { resolveFetch = resolve; })
    );

    const preFetchPromise = preFetchAudio('story-1', MOCK_STORY.story_text);
    const sourcePromise = getAudioSource(MOCK_STORY);

    resolveFetch('/cache/audio_story-1.mp3');

    const source = await sourcePromise;
    expect(source).toEqual({ uri: '/cache/audio_story-1.mp3' });
    expect(mockedFetchStoryAudio).toHaveBeenCalledTimes(1);

    await preFetchPromise;
  });
});

describe('getAmbientAudioSource', () => {
  it('returns ambient rain source', () => {
    const source = getAmbientAudioSource();
    expect(source).toEqual({ uri: 'mocked-ambient.mp3' });
  });
});

describe('preFetchAudio', () => {
  it('calls fetchStoryAudio with story text', async () => {
    mockedFetchStoryAudio.mockResolvedValue('/cache/audio_story-1.mp3');

    await preFetchAudio('story-1', 'Hello world');

    expect(mockedFetchStoryAudio).toHaveBeenCalledWith('story-1', 'Hello world');
  });

  it('deduplicates concurrent calls for the same storyId', async () => {
    let resolveFetch!: (value: string) => void;
    mockedFetchStoryAudio.mockImplementation(
      () => new Promise<string>((resolve) => { resolveFetch = resolve; })
    );

    const promise1 = preFetchAudio('story-1', 'Hello world');
    const promise2 = preFetchAudio('story-1', 'Hello world');

    expect(mockedFetchStoryAudio).toHaveBeenCalledTimes(1);

    resolveFetch('/cache/audio_story-1.mp3');

    const [result1, result2] = await Promise.all([promise1, promise2]);
    expect(result1).toBe('/cache/audio_story-1.mp3');
    expect(result2).toBe('/cache/audio_story-1.mp3');
  });

  it('allows new preFetch after previous completes', async () => {
    mockedFetchStoryAudio.mockResolvedValue('/cache/audio_story-1.mp3');

    await preFetchAudio('story-1', 'Hello world');
    await preFetchAudio('story-1', 'Hello world');

    expect(mockedFetchStoryAudio).toHaveBeenCalledTimes(2);
  });
});

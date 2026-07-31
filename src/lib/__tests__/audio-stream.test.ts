jest.mock('../audio-cache', () => ({
  getCachedAudioSegmentPaths: jest.fn(),
}));

jest.mock('../inworld-tts', () => ({
  streamStorySegment: jest.fn(),
  prefetchStoryAudio: jest.fn(),
}));

import { getCachedAudioSegmentPaths } from '../audio-cache';
import { streamStorySegment, prefetchStoryAudio } from '../inworld-tts';
import { getSegmentAudioSources, preFetchAudio } from '../audio-stream';

const mockedGetCachedAudioSegmentPaths = getCachedAudioSegmentPaths as jest.Mock;
const mockedStreamStorySegment = streamStorySegment as jest.Mock;
const mockedPrefetchStoryAudio = prefetchStoryAudio as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getSegmentAudioSources', () => {
  it('returns all cached segment URIs without streaming', async () => {
    mockedGetCachedAudioSegmentPaths.mockResolvedValue([
      '/cache/audio_story-1_0.mp3',
      '/cache/audio_story-1_1.mp3',
    ]);

    const result = await getSegmentAudioSources('story-1', 2);

    expect(result).toEqual([
      { uri: '/cache/audio_story-1_0.mp3' },
      { uri: '/cache/audio_story-1_1.mp3' },
    ]);
    expect(mockedStreamStorySegment).not.toHaveBeenCalled();
  });

  it('streams missing segments and returns all URIs', async () => {
    mockedGetCachedAudioSegmentPaths.mockResolvedValue([
      '/cache/audio_story-1_0.mp3',
      null,
    ]);

    mockedStreamStorySegment.mockResolvedValue({
      storyId: 'story-1',
      segmentIndex: 1,
      text: 'Second',
      uri: '/cache/audio_story-1_1.mp3',
    });

    const result = await getSegmentAudioSources('story-1', 2, ['First', 'Second']);

    expect(result).toEqual([
      { uri: '/cache/audio_story-1_0.mp3' },
      { uri: '/cache/audio_story-1_1.mp3' },
    ]);
    expect(mockedStreamStorySegment).toHaveBeenCalledTimes(1);
    expect(mockedStreamStorySegment).toHaveBeenCalledWith('story-1', 1, 'Second');
  });
});

describe('preFetchAudio', () => {
  it('calls prefetchStoryAudio with story text', async () => {
    mockedPrefetchStoryAudio.mockResolvedValue(undefined);

    await preFetchAudio('story-1', 'Hello world');

    expect(mockedPrefetchStoryAudio).toHaveBeenCalledWith('story-1', 'Hello world');
  });

  it('deduplicates concurrent calls for the same storyId', async () => {
    let resolvePrefetch!: () => void;
    mockedPrefetchStoryAudio.mockImplementation(
      () => new Promise<void>((resolve) => { resolvePrefetch = resolve; })
    );

    const promise1 = preFetchAudio('story-1', 'Hello');
    await new Promise((r) => setTimeout(r, 0));

    const promise2 = preFetchAudio('story-1', 'Hello');

    expect(mockedPrefetchStoryAudio).toHaveBeenCalledTimes(1);

    resolvePrefetch();

    await Promise.all([promise1, promise2]);
  });

  it('removes inflight entry after rejection', async () => {
    mockedPrefetchStoryAudio.mockRejectedValueOnce(new Error('TTS failed'));

    await expect(preFetchAudio('story-1', 'Hello')).rejects.toThrow('TTS failed');

    mockedPrefetchStoryAudio.mockResolvedValue(undefined);
    await preFetchAudio('story-1', 'Hello');

    expect(mockedPrefetchStoryAudio).toHaveBeenCalledTimes(2);
  });
});

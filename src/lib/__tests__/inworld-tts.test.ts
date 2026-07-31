jest.mock('../audio-cache', () => ({
  getCachedAudioSegmentPath: jest.fn(),
  writeAudioSegmentToCache: jest.fn(),
  enforceFifoEviction: jest.fn(),
}));

jest.mock('../story-segments', () => ({
  splitStoryIntoSegments: jest.fn(),
}));

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-access-token' } },
      }),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

const mockStream = jest.fn();

jest.mock('@inworld/tts', () => ({
  InworldTTS: jest.fn(() => ({
    stream: mockStream,
  })),
}));

import { getCachedAudioSegmentPath, writeAudioSegmentToCache, enforceFifoEviction } from '../audio-cache';
import { splitStoryIntoSegments } from '../story-segments';
import { supabase } from '../supabase';
import { InworldTTS } from '@inworld/tts';
import { streamStorySegment, prefetchStoryAudio } from '../inworld-tts';
import type { StoryAudioSegment } from '../inworld-tts';

const mockedGetCachedAudioSegmentPath = getCachedAudioSegmentPath as jest.Mock;
const mockedWriteAudioSegmentToCache = writeAudioSegmentToCache as jest.Mock;
const mockedEnforceFifoEviction = enforceFifoEviction as jest.Mock;
const mockedInvoke = supabase.functions.invoke as jest.Mock;
const mockedInworldTTS = InworldTTS as jest.Mock;
const mockedSplitStoryIntoSegments = splitStoryIntoSegments as jest.Mock;

function makeChunks(data: Uint8Array, chunkSize: number): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  return chunks;
}

async function* asyncGenerator(chunks: Uint8Array[]) {
  for (const chunk of chunks) {
    yield chunk;
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedInvoke.mockResolvedValue({
    data: { token: 'test-jwt-token', expiresAt: Date.now() + 3600_000 },
    error: null,
  });
});

describe('streamStorySegment', () => {
  it('streams TTS audio and writes to cache on miss', async () => {
    mockedGetCachedAudioSegmentPath.mockResolvedValue(null);

    const audioData = new Uint8Array([1, 2, 3, 4, 5]);
    const chunks = makeChunks(audioData, 2);
    mockStream.mockReturnValue(asyncGenerator(chunks));

    mockedWriteAudioSegmentToCache.mockResolvedValue('/cache/audio_story-1_0.mp3');

    const result: StoryAudioSegment = await streamStorySegment('story-1', 0, 'Hello world');

    expect(mockedInvoke).toHaveBeenCalledWith('generate-inworld-token');
    expect(mockedInworldTTS).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'test-jwt-token',
        onTokenExpiring: expect.any(Function),
      })
    );
    expect(mockStream).toHaveBeenCalledWith({
      text: 'Hello world',
      voice: 'Ashley',
      model: 'inworld-tts-1.5-mini',
      encoding: 'MP3',
    });
    expect(mockedWriteAudioSegmentToCache).toHaveBeenCalledWith(
      'story-1',
      0,
      expect.any(Uint8Array)
    );
    expect(mockedEnforceFifoEviction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      storyId: 'story-1',
      segmentIndex: 0,
      text: 'Hello world',
      uri: '/cache/audio_story-1_0.mp3',
    });
  });

  it('returns cached segment without streaming on cache hit', async () => {
    mockedGetCachedAudioSegmentPath.mockResolvedValue('/cache/audio_story-1_0.mp3');

    const result = await streamStorySegment('story-1', 0, 'Hello world');

    expect(mockStream).not.toHaveBeenCalled();
    expect(mockedInvoke).not.toHaveBeenCalled();
    expect(result).toEqual({
      storyId: 'story-1',
      segmentIndex: 0,
      text: 'Hello world',
      uri: '/cache/audio_story-1_0.mp3',
    });
  });

  it('concatenates all chunks into a single Uint8Array before writing', async () => {
    mockedGetCachedAudioSegmentPath.mockResolvedValue(null);

    const chunk1 = new Uint8Array([10, 20]);
    const chunk2 = new Uint8Array([30, 40, 50]);
    mockStream.mockReturnValue(asyncGenerator([chunk1, chunk2]));

    mockedWriteAudioSegmentToCache.mockResolvedValue('/cache/audio_story-1_0.mp3');

    await streamStorySegment('story-1', 0, 'Test');

    const writtenBytes = mockedWriteAudioSegmentToCache.mock.calls[0][2];
    expect(writtenBytes).toEqual(new Uint8Array([10, 20, 30, 40, 50]));
  });

  it('throws when session is null', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: null },
    });
    mockedGetCachedAudioSegmentPath.mockResolvedValue(null);

    await expect(streamStorySegment('story-1', 0, 'Hello')).rejects.toThrow(
      'Not authenticated'
    );
  });
});

describe('prefetchStoryAudio', () => {
  beforeEach(() => {
    mockedGetCachedAudioSegmentPath.mockResolvedValue(null);
    const audioData = new Uint8Array([1, 2, 3]);
    mockStream.mockReturnValue(asyncGenerator([audioData]));
    mockedWriteAudioSegmentToCache.mockResolvedValue('/cache/audio_story-1_0.mp3');
  });

  it('streams segments sequentially', async () => {
    mockedSplitStoryIntoSegments.mockReturnValue(['First.', 'Second.', 'Third.']);
    const streamOrder: number[] = [];
    mockStream.mockImplementation(async function* () {
      streamOrder.push(mockStream.mock.calls.length);
      await new Promise((r) => setTimeout(r, 10));
      yield new Uint8Array([1]);
    });

    await prefetchStoryAudio('story-1', 'First. Second. Third.');

    expect(mockStream).toHaveBeenCalledTimes(3);
    const calls = mockStream.mock.calls;
    expect(calls[0][0].text).toBe('First.');
    expect(calls[1][0].text).toBe('Second.');
    expect(calls[2][0].text).toBe('Third.');
  });

  it('deduplicates concurrent prefetch calls for the same story', async () => {
    mockedSplitStoryIntoSegments.mockReturnValue(['Hello.']);

    let resolveStream!: () => void;
    mockStream.mockImplementation(async function* () {
      await new Promise<void>((resolve) => { resolveStream = resolve; });
      yield new Uint8Array([1]);
    });

    const promise1 = prefetchStoryAudio('story-1', 'Hello.');
    await new Promise((r) => setTimeout(r, 0));

    const promise2 = prefetchStoryAudio('story-1', 'Hello.');

    resolveStream();

    await Promise.all([promise1, promise2]);

    expect(mockStream).toHaveBeenCalledTimes(1);
  });

  it('stops later segments when a segment stream rejects', async () => {
    mockedSplitStoryIntoSegments.mockReturnValue(['First.', 'Second.', 'Third.']);
    let callCount = 0;
    mockStream.mockImplementation(async function* () {
      callCount++;
      if (callCount === 2) {
        throw new Error('TTS failed');
      }
      yield new Uint8Array([1]);
    });

    await expect(
      prefetchStoryAudio('story-1', 'First. Second. Third.')
    ).rejects.toThrow('TTS failed');

    expect(mockStream).toHaveBeenCalledTimes(2);
  });

  it('clears dedup entry after completion', async () => {
    mockedSplitStoryIntoSegments.mockReturnValue(['Hello.']);
    mockStream.mockReturnValue(asyncGenerator([new Uint8Array([1])]));

    await prefetchStoryAudio('story-1', 'Hello.');

    mockStream.mockClear();
    mockStream.mockReturnValue(asyncGenerator([new Uint8Array([1])]));
    mockedGetCachedAudioSegmentPath.mockResolvedValue(null);

    await prefetchStoryAudio('story-1', 'Hello.');

    expect(mockStream).toHaveBeenCalledTimes(1);
  });
});

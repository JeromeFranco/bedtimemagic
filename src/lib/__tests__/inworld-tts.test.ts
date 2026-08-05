const mockWriterInstances: {
  storyId: string;
  segmentIndex: number;
  write: jest.Mock;
  finish: jest.Mock;
  abort: jest.Mock;
}[] = [];

jest.mock('../audio-cache', () => ({
  getCachedAudioSegmentPath: jest.fn(),
  AudioSegmentWriter: jest.fn().mockImplementation((storyId: string, segmentIndex: number) => {
    const writer = {
      storyId,
      segmentIndex,
      write: jest.fn(),
      finish: jest
        .fn()
        .mockResolvedValue(`/cache/audio_v2_${storyId}_${segmentIndex}.mp3`),
      abort: jest.fn(),
    };
    mockWriterInstances.push(writer);
    return writer;
  }),
  enforceFifoEviction: jest.fn().mockResolvedValue(undefined),
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

import { getCachedAudioSegmentPath, AudioSegmentWriter, enforceFifoEviction } from '../audio-cache';
import { splitStoryIntoSegments } from '../story-segments';
import { supabase } from '../supabase';
import { InworldTTS } from '@inworld/tts';
import { streamStorySegment, prefetchStoryAudio, resetTokenCache } from '../inworld-tts';
import type { StoryAudioSegment } from '../inworld-tts';

const mockedGetCachedAudioSegmentPath = getCachedAudioSegmentPath as jest.Mock;
const mockedAudioSegmentWriter = AudioSegmentWriter as jest.Mock;
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
  mockWriterInstances.length = 0;
  resetTokenCache();
  mockedInvoke.mockResolvedValue({
    data: { token: 'test-jwt-token', expirationTime: new Date(Date.now() + 3600_000).toISOString() },
    error: null,
  });
});

describe('streamStorySegment', () => {
  it('streams TTS audio and writes chunks progressively on cache miss', async () => {
    mockedGetCachedAudioSegmentPath.mockResolvedValue(null);

    const audioData = new Uint8Array([1, 2, 3, 4, 5]);
    const chunks = makeChunks(audioData, 2);
    mockStream.mockReturnValue(asyncGenerator(chunks));

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
    expect(mockedAudioSegmentWriter).toHaveBeenCalledWith('story-1', 0);
    const writer = mockWriterInstances[0];
    expect(writer.write).toHaveBeenCalledTimes(3);
    expect(writer.finish).toHaveBeenCalledTimes(1);
    expect(writer.abort).not.toHaveBeenCalled();
    expect(mockedEnforceFifoEviction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      storyId: 'story-1',
      segmentIndex: 0,
      text: 'Hello world',
      uri: '/cache/audio_v2_story-1_0.mp3',
    });
  });

  it('returns cached segment without streaming on cache hit', async () => {
    mockedGetCachedAudioSegmentPath.mockResolvedValue('/cache/audio_v2_story-1_0.mp3');

    const result = await streamStorySegment('story-1', 0, 'Hello world');

    expect(mockStream).not.toHaveBeenCalled();
    expect(mockedInvoke).not.toHaveBeenCalled();
    expect(mockedAudioSegmentWriter).not.toHaveBeenCalled();
    expect(result).toEqual({
      storyId: 'story-1',
      segmentIndex: 0,
      text: 'Hello world',
      uri: '/cache/audio_v2_story-1_0.mp3',
    });
  });

  it('passes each chunk to the writer without in-memory merging', async () => {
    mockedGetCachedAudioSegmentPath.mockResolvedValue(null);

    const chunk1 = new Uint8Array([10, 20]);
    const chunk2 = new Uint8Array([30, 40, 50]);
    mockStream.mockReturnValue(asyncGenerator([chunk1, chunk2]));

    await streamStorySegment('story-1', 0, 'Test');

    const writer = mockWriterInstances[0];
    expect(writer.write).toHaveBeenCalledTimes(2);
    expect(writer.write.mock.calls[0][0]).toEqual(chunk1);
    expect(writer.write.mock.calls[1][0]).toEqual(chunk2);
  });

  it('aborts the partial file when the stream fails', async () => {
    mockedGetCachedAudioSegmentPath.mockResolvedValue(null);
    mockStream.mockImplementation(async function* () {
      yield new Uint8Array([1]);
      throw new Error('stream broke');
    });

    await expect(streamStorySegment('story-1', 0, 'Test')).rejects.toThrow('stream broke');

    const writer = mockWriterInstances[0];
    expect(writer.abort).toHaveBeenCalled();
    expect(writer.finish).not.toHaveBeenCalled();
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

  it('reuses cached token until near expiry', async () => {
    mockedGetCachedAudioSegmentPath.mockResolvedValue(null);
    mockStream.mockReturnValue(asyncGenerator([new Uint8Array([1])]));

    await streamStorySegment('story-1', 0, 'Hello');
    await streamStorySegment('story-1', 1, 'World');

    expect(mockedInvoke).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent requests for the same segment', async () => {
    mockedGetCachedAudioSegmentPath.mockResolvedValue(null);

    let resolveStream!: () => void;
    const streamStarted = new Promise<void>((resolve) => {
      resolveStream = resolve;
    });
    let iterationCount = 0;
    mockStream.mockImplementation(async function* () {
      iterationCount++;
      await streamStarted;
      yield new Uint8Array([1]);
    });

    const promise1 = streamStorySegment('story-1', 0, 'Hello');
    await new Promise((r) => process.nextTick(r));
    const promise2 = streamStorySegment('story-1', 0, 'Hello');

    resolveStream();

    const [result1, result2] = await Promise.all([promise1, promise2]);
    expect(iterationCount).toBe(1);
    expect(mockedAudioSegmentWriter).toHaveBeenCalledTimes(1);
    expect(result1.uri).toBe(result2.uri);
  });
});

describe('prefetchStoryAudio', () => {
  it('streams segments sequentially', async () => {
    mockedGetCachedAudioSegmentPath.mockResolvedValue(null);
    mockedSplitStoryIntoSegments.mockReturnValue(['First.', 'Second.', 'Third.']);

    let callCount = 0;
    mockStream.mockImplementation(async function* () {
      callCount++;
      yield new Uint8Array([callCount]);
    });

    await prefetchStoryAudio('story-1', 'First. Second. Third.');

    expect(mockStream).toHaveBeenCalledTimes(3);
    const calls = mockStream.mock.calls;
    expect(calls[0][0].text).toBe('First.');
    expect(calls[1][0].text).toBe('Second.');
    expect(calls[2][0].text).toBe('Third.');
  });

  it('deduplicates concurrent prefetch calls for the same story', async () => {
    mockedGetCachedAudioSegmentPath.mockResolvedValue(null);
    mockedSplitStoryIntoSegments.mockReturnValue(['Hello.']);

    let resolveStream!: () => void;
    const streamStarted = new Promise<void>((resolve) => {
      resolveStream = resolve;
    });
    let iterationCount = 0;
    mockStream.mockImplementation(async function* () {
      iterationCount++;
      await streamStarted;
      yield new Uint8Array([1]);
    });

    const promise1 = prefetchStoryAudio('story-1', 'Hello.');
    await new Promise((r) => process.nextTick(r));
    const promise2 = prefetchStoryAudio('story-1', 'Hello.');

    resolveStream();

    await Promise.all([promise1, promise2]);

    expect(iterationCount).toBe(1);
  });

  it('stops later segments when a segment stream rejects', async () => {
    mockedGetCachedAudioSegmentPath.mockResolvedValue(null);
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
    mockedGetCachedAudioSegmentPath.mockResolvedValue(null);
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

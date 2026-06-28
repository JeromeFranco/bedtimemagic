jest.mock('../audio-cache', () => ({
  writeAudioChunk: jest.fn(),
  finalizeAudioCache: jest.fn(),
  enforceFifoEviction: jest.fn(),
}));

jest.mock('../supabase', () => ({
  supabase: {
    supabaseUrl: 'https://test.supabase.co',
    supabaseKey: 'test-anon-key',
  },
}));

import { writeAudioChunk, finalizeAudioCache, enforceFifoEviction } from '../audio-cache';
import { streamStoryAudio } from '../audio-stream';

const mockedWriteAudioChunk = writeAudioChunk as jest.Mock;
const mockedFinalizeAudioCache = finalizeAudioCache as jest.Mock;
const mockedEnforceFifoEviction = enforceFifoEviction as jest.Mock;

const originalFetch = globalThis.fetch;

function createMockSSEResponse(events: string[]): Response {
  const body = events.join('\n') + '\n';
  const encoder = new TextEncoder();
  const encoded = encoder.encode(body);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoded);
      controller.close();
    },
  });

  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = jest.fn() as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('streamStoryAudio', () => {
  it('processes SSE chunks and writes to cache', async () => {
    const sseEvents = [
      'event: chunk',
      'data: {"audio":"aGVsbG8="}',
      '',
      'event: chunk',
      'data: {"audio":"d29ybGQ="}',
      '',
      'event: done',
      'data: {}',
      '',
    ];

    (globalThis.fetch as jest.Mock).mockResolvedValue(createMockSSEResponse(sseEvents));
    mockedFinalizeAudioCache.mockResolvedValue('/cache/audio_story-1.mp3');

    const result = await streamStoryAudio('story-1', 'Hello world');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://test.supabase.co/functions/v1/generate-story-audio',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-anon-key',
        },
        body: JSON.stringify({ story_text: 'Hello world' }),
      })
    );
    expect(mockedWriteAudioChunk).toHaveBeenCalledTimes(2);
    expect(mockedWriteAudioChunk).toHaveBeenCalledWith('story-1', 'aGVsbG8=');
    expect(mockedWriteAudioChunk).toHaveBeenCalledWith('story-1', 'd29ybGQ=');
    expect(mockedEnforceFifoEviction).toHaveBeenCalledTimes(1);
    expect(mockedFinalizeAudioCache).toHaveBeenCalledWith('story-1');
    expect(result).toBe('/cache/audio_story-1.mp3');
  });

  it('throws on SSE error event', async () => {
    const sseEvents = [
      'event: error',
      'data: {"message":"TTS failed","sentence_index":2}',
      '',
    ];

    (globalThis.fetch as jest.Mock).mockResolvedValue(createMockSSEResponse(sseEvents));

    await expect(streamStoryAudio('story-1', 'Hello')).rejects.toThrow('TTS failed');
  });

  it('throws on non-ok response', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(
      new Response('Internal Server Error', { status: 500 })
    );

    await expect(streamStoryAudio('story-1', 'Hello')).rejects.toThrow(
      'Edge function returned 500'
    );
  });

  it('throws when stream ends without done event', async () => {
    const sseEvents = [
      'event: chunk',
      'data: {"audio":"aGVsbG8="}',
      '',
    ];

    (globalThis.fetch as jest.Mock).mockResolvedValue(createMockSSEResponse(sseEvents));

    await expect(streamStoryAudio('story-1', 'Hello')).rejects.toThrow(
      'Stream ended without done event'
    );
  });
});

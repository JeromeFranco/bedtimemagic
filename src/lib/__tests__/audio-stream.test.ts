jest.mock('../audio-cache', () => ({
  writeAudioToCache: jest.fn(),
  enforceFifoEviction: jest.fn(),
}));

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-access-token' } },
      }),
    },
  },
}));

process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';

import { writeAudioToCache, enforceFifoEviction } from '../audio-cache';
import { supabase } from '../supabase';
import { fetchStoryAudio } from '../audio-stream';

const mockedWriteAudioToCache = writeAudioToCache as jest.Mock;
const mockedEnforceFifoEviction = enforceFifoEviction as jest.Mock;
const mockedGetSession = supabase.auth.getSession as jest.Mock;

const originalFetch = globalThis.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetSession.mockResolvedValue({ data: { session: { access_token: 'test-access-token' } } });
  globalThis.fetch = jest.fn() as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('fetchStoryAudio', () => {
  it('fetches mp3 audio and writes to cache', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ audio: 'aGVsbG8=' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    mockedWriteAudioToCache.mockResolvedValue('/cache/audio_story-1.mp3');

    const result = await fetchStoryAudio('story-1', 'Hello world');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://test.supabase.co/functions/v1/generate-story-audio',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-access-token',
        },
        body: JSON.stringify({ story_text: 'Hello world' }),
      })
    );
    expect(mockedWriteAudioToCache).toHaveBeenCalledWith('story-1', 'aGVsbG8=');
    expect(mockedEnforceFifoEviction).toHaveBeenCalledTimes(1);
    expect(result).toBe('/cache/audio_story-1.mp3');
  });

  it('throws on non-ok response', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(
      new Response('Internal Server Error', { status: 500 })
    );

    await expect(fetchStoryAudio('story-1', 'Hello')).rejects.toThrow(
      'Edge function returned 500'
    );
  });

  it('throws when response has no audio data', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ error: 'TTS failed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(fetchStoryAudio('story-1', 'Hello')).rejects.toThrow(
      'No audio data in response'
    );
  });

  it('throws when session is null', async () => {
    mockedGetSession.mockResolvedValueOnce({ data: { session: null } });

    await expect(fetchStoryAudio('story-1', 'Hello')).rejects.toThrow('Not authenticated');
  });
});

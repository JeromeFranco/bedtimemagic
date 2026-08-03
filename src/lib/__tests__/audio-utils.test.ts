jest.mock('../audio-cache', () => ({
  getCachedAudioPath: jest.fn(),
  getCachedAudioSegmentPaths: jest.fn(),
}));

jest.mock('../audio-stream', () => ({
  getSegmentAudioSources: jest.fn(),
  preFetchAudio: jest.fn(),
}));

jest.mock('../../../assets/audio/sample-story.mp3', () => 'mocked-sample.mp3', { virtual: true });
jest.mock('../../../assets/audio/ambient-rain.mp3', () => 'mocked-ambient.mp3', { virtual: true });

import { getCachedAudioPath, getCachedAudioSegmentPaths } from '../audio-cache';
import { getSegmentAudioSources } from '../audio-stream';
import { getAudioSource, getAmbientAudioSource, getSampleAudioSource } from '../audio-utils';
import type { Story } from '@/types';

const mockedGetCachedAudioPath = getCachedAudioPath as jest.Mock;
const mockedGetCachedAudioSegmentPaths = getCachedAudioSegmentPaths as jest.Mock;
const mockedGetSegmentAudioSources = getSegmentAudioSources as jest.Mock;

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
  it('returns cached segment path on cache hit', async () => {
    mockedGetCachedAudioSegmentPaths.mockResolvedValue(['/cache/audio_story-1_0.mp3']);

    const source = await getAudioSource(MOCK_STORY);

    expect(source).toEqual({ uri: '/cache/audio_story-1_0.mp3' });
    expect(mockedGetCachedAudioSegmentPaths).toHaveBeenCalledWith('story-1', 1);
    expect(mockedGetSegmentAudioSources).not.toHaveBeenCalled();
  });

  it('streams missing segments on cache miss', async () => {
    mockedGetCachedAudioSegmentPaths.mockResolvedValue([null]);
    mockedGetSegmentAudioSources.mockResolvedValue([{ uri: '/cache/audio_story-1_0.mp3' }]);

    const source = await getAudioSource(MOCK_STORY);

    expect(source).toEqual({ uri: '/cache/audio_story-1_0.mp3' });
    expect(mockedGetSegmentAudioSources).toHaveBeenCalledWith('story-1', 1, ['Once upon a time...']);
  });

  it('falls back to legacy single-file cache', async () => {
    mockedGetCachedAudioSegmentPaths.mockResolvedValue([]);
    mockedGetCachedAudioPath.mockResolvedValue('/cache/audio_story-1.mp3');

    const source = await getAudioSource(MOCK_STORY);

    expect(source).toEqual({ uri: '/cache/audio_story-1.mp3' });
  });
});

describe('getAmbientAudioSource', () => {
  it('returns ambient rain source', () => {
    const source = getAmbientAudioSource();
    expect(source).toEqual('mocked-ambient.mp3');
  });
});

describe('getSampleAudioSource', () => {
  it('returns sample audio source', () => {
    const source = getSampleAudioSource();
    expect(source).toEqual('mocked-sample.mp3');
  });
});

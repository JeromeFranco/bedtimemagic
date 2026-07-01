jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/mock/cache/',
  getInfoAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

import * as FileSystem from 'expo-file-system/legacy';
import {
  getCachedAudioPath,
  writeAudioChunk,
  finalizeAudioCache,
  evictStory,
  enforceFifoEviction,
  writeSentenceToCache,
  AUDIO_CACHE_PREFIX,
} from '../audio-cache';

const mockedGetInfo = FileSystem.getInfoAsync as jest.Mock;
const mockedWrite = FileSystem.writeAsStringAsync as jest.Mock;
const mockedRead = FileSystem.readAsStringAsync as jest.Mock;
const mockedDelete = FileSystem.deleteAsync as jest.Mock;
const mockedReadDir = FileSystem.readDirectoryAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getCachedAudioPath', () => {
  it('returns path when file exists', async () => {
    mockedGetInfo.mockResolvedValue({ exists: true });
    const result = await getCachedAudioPath('story-1');
    expect(result).toBe('/mock/cache/audio_story-1.wav');
    expect(mockedGetInfo).toHaveBeenCalledWith('/mock/cache/audio_story-1.wav');
  });

  it('returns null when file does not exist', async () => {
    mockedGetInfo.mockResolvedValue({ exists: false });
    const result = await getCachedAudioPath('story-1');
    expect(result).toBeNull();
  });
});

describe('writeAudioChunk + finalizeAudioCache', () => {
  it('accumulates chunks in memory and writes on finalize', async () => {
    await writeAudioChunk('story-1', 'aGVsbG8=');
    await writeAudioChunk('story-1', 'd29ybGQ=');

    const result = await finalizeAudioCache('story-1');

    expect(result).toBe('/mock/cache/audio_story-1.wav');
    expect(mockedWrite).toHaveBeenCalledTimes(1);
    expect(mockedWrite).toHaveBeenCalledWith(
      '/mock/cache/audio_story-1.wav',
      'aGVsbG8=d29ybGQ=',
      { encoding: 'base64' }
    );
  });

  it('does not write if no chunks were added', async () => {
    const result = await finalizeAudioCache('story-1');
    expect(result).toBe('/mock/cache/audio_story-1.wav');
    expect(mockedWrite).not.toHaveBeenCalled();
  });
});

describe('writeSentenceToCache', () => {
  it('creates new file for index 0 with full WAV data', async () => {
    mockedWrite.mockResolvedValue(undefined);

    await writeSentenceToCache('story-1', 0, 'aGVsbG8=');

    expect(mockedWrite).toHaveBeenCalledWith(
      '/mock/cache/audio_story-1.wav',
      'aGVsbG8=',
      { encoding: 'base64' }
    );
  });

  it('appends PCM data for index > 0', async () => {
    mockedWrite.mockResolvedValue(undefined);
    mockedRead.mockResolvedValue('EXISTING');

    // 59 chars = header (44 bytes), + 21 chars = PCM data
    const sentenceBase64 = 'A'.repeat(59) + 'B'.repeat(21);

    await writeSentenceToCache('story-1', 1, sentenceBase64);

    expect(mockedRead).toHaveBeenCalledWith('/mock/cache/audio_story-1.wav', {
      encoding: 'base64',
    });
    expect(mockedWrite).toHaveBeenCalledWith(
      '/mock/cache/audio_story-1.wav',
      'EXISTING' + 'B'.repeat(21),
      { encoding: 'base64' }
    );
  });
});

describe('evictStory', () => {
  it('deletes audio and cover when they exist', async () => {
    mockedGetInfo.mockResolvedValue({ exists: true });
    mockedDelete.mockResolvedValue(undefined);

    await evictStory('story-1');

    expect(mockedDelete).toHaveBeenCalledWith('/mock/cache/audio_story-1.wav');
    expect(mockedDelete).toHaveBeenCalledWith('/mock/cache/cover_story-1.jpg');
  });

  it('skips deletion when files do not exist', async () => {
    mockedGetInfo.mockResolvedValue({ exists: false });

    await evictStory('story-1');

    expect(mockedDelete).not.toHaveBeenCalled();
  });
});

describe('enforceFifoEviction', () => {
  it('does nothing if <= 5 files', async () => {
    mockedReadDir.mockResolvedValue([
      'audio_story-1.wav',
      'audio_story-2.wav',
      'audio_story-3.wav',
      'other-file.txt',
    ]);
    mockedGetInfo.mockResolvedValue({ exists: true, modificationTime: 1000 });

    await enforceFifoEviction();

    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('evicts oldest when > 5 files', async () => {
    const audioFiles = Array.from({ length: 7 }, (_, i) => `audio_story-${i + 1}.wav`);
    mockedReadDir.mockResolvedValue(audioFiles);
    mockedGetInfo.mockImplementation(async (path: string) => {
      const match = path.match(/story-(\d+)/);
      const id = match ? parseInt(match[1]) : 0;
      return { exists: true, modificationTime: id * 1000 };
    });
    mockedDelete.mockResolvedValue(undefined);

    await enforceFifoEviction();

    expect(mockedDelete).toHaveBeenCalledWith('/mock/cache/audio_story-1.wav');
    expect(mockedDelete).toHaveBeenCalledWith('/mock/cache/cover_story-1.jpg');
    expect(mockedDelete).toHaveBeenCalledWith('/mock/cache/audio_story-2.wav');
    expect(mockedDelete).toHaveBeenCalledWith('/mock/cache/cover_story-2.jpg');
    expect(mockedDelete).toHaveBeenCalledTimes(4);
  });
});

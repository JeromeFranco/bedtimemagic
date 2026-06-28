jest.mock('expo-file-system', () => ({
  cacheDirectory: '/mock/cache/',
  getInfoAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

import * as FileSystem from 'expo-file-system';
import {
  getCachedAudioPath,
  writeAudioChunk,
  finalizeAudioCache,
  evictStory,
  enforceFifoEviction,
  AUDIO_CACHE_PREFIX,
} from '../audio-cache';

const mockedGetInfo = FileSystem.getInfoAsync as jest.Mock;
const mockedWrite = FileSystem.writeAsStringAsync as jest.Mock;
const mockedReadFile = FileSystem.readAsStringAsync as jest.Mock;
const mockedDelete = FileSystem.deleteAsync as jest.Mock;
const mockedReadDir = FileSystem.readDirectoryAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getCachedAudioPath', () => {
  it('returns path when file exists', async () => {
    mockedGetInfo.mockResolvedValue({ exists: true });
    const result = await getCachedAudioPath('story-1');
    expect(result).toBe('/mock/cache/audio_story-1.mp3');
    expect(mockedGetInfo).toHaveBeenCalledWith('/mock/cache/audio_story-1.mp3');
  });

  it('returns null when file does not exist', async () => {
    mockedGetInfo.mockResolvedValue({ exists: false });
    const result = await getCachedAudioPath('story-1');
    expect(result).toBeNull();
  });
});

describe('writeAudioChunk', () => {
  it('creates file on first chunk', async () => {
    mockedGetInfo.mockResolvedValue({ exists: false });
    mockedWrite.mockResolvedValue(undefined);

    await writeAudioChunk('story-1', 'aGVsbG8=');

    expect(mockedWrite).toHaveBeenCalledWith(
      '/mock/cache/audio_story-1.mp3',
      'aGVsbG8=',
      { encoding: 'base64' }
    );
  });

  it('appends on subsequent chunks', async () => {
    mockedGetInfo.mockResolvedValue({ exists: true });
    mockedReadFile.mockResolvedValue('ZXhpc3Rpbmc=');
    mockedWrite.mockResolvedValue(undefined);

    await writeAudioChunk('story-1', 'YXBwZW5k');

    expect(mockedReadFile).toHaveBeenCalledWith('/mock/cache/audio_story-1.mp3', {
      encoding: 'base64',
    });
    expect(mockedWrite).toHaveBeenCalledWith(
      '/mock/cache/audio_story-1.mp3',
      'ZXhpc3Rpbmc=YXBwZW5k',
      { encoding: 'base64' }
    );
  });
});

describe('finalizeAudioCache', () => {
  it('returns the cached file path', async () => {
    const result = await finalizeAudioCache('story-1');
    expect(result).toBe('/mock/cache/audio_story-1.mp3');
  });
});

describe('evictStory', () => {
  it('deletes audio and cover when they exist', async () => {
    mockedGetInfo.mockResolvedValue({ exists: true });
    mockedDelete.mockResolvedValue(undefined);

    await evictStory('story-1');

    expect(mockedDelete).toHaveBeenCalledWith('/mock/cache/audio_story-1.mp3');
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
      'audio_story-1.mp3',
      'audio_story-2.mp3',
      'audio_story-3.mp3',
      'other-file.txt',
    ]);
    mockedGetInfo.mockResolvedValue({ exists: true, modificationTime: 1000 });

    await enforceFifoEviction();

    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('evicts oldest when > 5 files', async () => {
    const audioFiles = Array.from({ length: 7 }, (_, i) => `audio_story-${i + 1}.mp3`);
    mockedReadDir.mockResolvedValue(audioFiles);
    mockedGetInfo.mockImplementation(async (path: string) => {
      const match = path.match(/story-(\d+)/);
      const id = match ? parseInt(match[1]) : 0;
      return { exists: true, modificationTime: id * 1000 };
    });
    mockedDelete.mockResolvedValue(undefined);

    await enforceFifoEviction();

    expect(mockedDelete).toHaveBeenCalledWith('/mock/cache/audio_story-1.mp3');
    expect(mockedDelete).toHaveBeenCalledWith('/mock/cache/cover_story-1.jpg');
    expect(mockedDelete).toHaveBeenCalledWith('/mock/cache/audio_story-2.mp3');
    expect(mockedDelete).toHaveBeenCalledWith('/mock/cache/cover_story-2.jpg');
    expect(mockedDelete).toHaveBeenCalledTimes(4);
  });
});

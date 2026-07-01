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

describe('finalizeAudioCache', () => {
  it('returns the audio path', async () => {
    const result = await finalizeAudioCache('story-1');
    expect(result).toBe('/mock/cache/audio_story-1.wav');
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

  it('appends PCM data for index > 0 with correct header strip', async () => {
    mockedWrite.mockResolvedValue(undefined);
    mockedRead.mockResolvedValue('EXISTING');

    // Build a real 44-byte WAV header + 10 bytes PCM, base64-encode the full buffer
    const headerBytes = new Uint8Array(44).fill(0x01);
    const pcmBytes = new Uint8Array(10).fill(0x02);
    const fullBytes = new Uint8Array(54);
    fullBytes.set(headerBytes, 0);
    fullBytes.set(pcmBytes, 44);
    const wavBase64 = btoa(String.fromCharCode(...fullBytes));

    // Verify the header occupies exactly 60 base64 chars: Math.ceil(44/3)*4 = 60
    const headerBase64 = btoa(String.fromCharCode(...headerBytes));
    expect(headerBase64).toHaveLength(60);

    await writeSentenceToCache('story-1', 1, wavBase64);

    expect(mockedRead).toHaveBeenCalledWith('/mock/cache/audio_story-1.wav', {
      encoding: 'base64',
    });
    // The function should strip the first 60 base64 chars (WAV header)
    expect(mockedWrite).toHaveBeenCalledWith(
      '/mock/cache/audio_story-1.wav',
      'EXISTING' + wavBase64.slice(60),
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

const mockFiles = new Map<string, { exists: boolean; lastModified: number }>();

jest.mock('expo-file-system', () => {
  function resolveUri(...parts: any[]): string {
    return parts
      .map((p) => (p && typeof p === 'object' && 'uri' in p ? p.uri : String(p)))
      .join('/');
  }

  class MockFile {
    uri: string;
    name: string;
    exists: boolean;
    lastModified: number | null;

    constructor(...parts: any[]) {
      this.uri = resolveUri(...parts);
      this.name = this.uri.split('/').pop() ?? '';
      const mock = mockFiles.get(this.uri);
      this.exists = mock?.exists ?? false;
      this.lastModified = mock?.lastModified ?? null;
    }

    write(_content: string, _options?: { encoding?: string }) {
      mockFiles.set(this.uri, { exists: true, lastModified: Date.now() });
      this.exists = true;
    }

    delete() {
      mockFiles.set(this.uri, { exists: false, lastModified: 0 });
      this.exists = false;
    }
  }

  class MockDirectory {
    uri: string;
    exists: boolean;

    constructor(...parts: any[]) {
      this.uri = resolveUri(...parts);
      this.exists = this.uri === '/mock/cache';
    }

    list(): MockFile[] {
      return Array.from(mockFiles.entries())
        .filter(([path]) => path.startsWith(this.uri + '/'))
        .map(([path]) => new MockFile(path));
    }
  }

  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: {
      cache: new MockDirectory('/mock/cache'),
    },
    EncodingType: {
      Base64: 'base64',
      UTF8: 'utf8',
    },
  };
});

import {
  getCachedAudioPath,
  writeAudioToCache,
  evictStory,
  enforceFifoEviction,
} from '../audio-cache';

beforeEach(() => {
  mockFiles.clear();
});

describe('getCachedAudioPath', () => {
  it('returns path when file exists', async () => {
    mockFiles.set('/mock/cache/audio_story-1.mp3', { exists: true, lastModified: 1000 });
    const result = await getCachedAudioPath('story-1');
    expect(result).toBe('/mock/cache/audio_story-1.mp3');
  });

  it('returns null when file does not exist', async () => {
    const result = await getCachedAudioPath('story-1');
    expect(result).toBeNull();
  });
});

describe('writeAudioToCache', () => {
  it('writes base64 audio to mp3 file and returns path', async () => {
    const result = await writeAudioToCache('story-1', 'aGVsbG8=');
    expect(result).toBe('/mock/cache/audio_story-1.mp3');
    expect(mockFiles.get('/mock/cache/audio_story-1.mp3')?.exists).toBe(true);
  });
});

describe('evictStory', () => {
  it('deletes audio and cover when they exist', async () => {
    mockFiles.set('/mock/cache/audio_story-1.mp3', { exists: true, lastModified: 1000 });
    mockFiles.set('/mock/cache/cover_story-1.jpg', { exists: true, lastModified: 1000 });

    await evictStory('story-1');

    expect(mockFiles.get('/mock/cache/audio_story-1.mp3')?.exists).toBe(false);
    expect(mockFiles.get('/mock/cache/cover_story-1.jpg')?.exists).toBe(false);
  });

  it('skips deletion when files do not exist', async () => {
    await evictStory('story-1');
    expect(mockFiles.size).toBe(0);
  });
});

describe('enforceFifoEviction', () => {
  it('does nothing if <= 5 files', async () => {
    const ids = ['1', '2', '3'];
    for (const id of ids) {
      mockFiles.set(`/mock/cache/audio_story-${id}.mp3`, {
        exists: true,
        lastModified: parseInt(id) * 1000,
      });
    }

    await enforceFifoEviction();

    const audioFiles = Array.from(mockFiles.entries()).filter(
      ([path]) => path.startsWith('/mock/cache/audio_') && path.endsWith('.mp3')
    );
    expect(audioFiles.length).toBe(3);
  });

  it('evicts oldest when > 5 files', async () => {
    const ids = ['1', '2', '3', '4', '5', '6', '7'];
    for (const id of ids) {
      mockFiles.set(`/mock/cache/audio_story-${id}.mp3`, {
        exists: true,
        lastModified: parseInt(id) * 1000,
      });
      mockFiles.set(`/mock/cache/cover_story-${id}.jpg`, {
        exists: true,
        lastModified: parseInt(id) * 1000,
      });
    }

    await enforceFifoEviction();

    expect(mockFiles.get('/mock/cache/audio_story-1.mp3')?.exists).toBe(false);
    expect(mockFiles.get('/mock/cache/cover_story-1.jpg')?.exists).toBe(false);
    expect(mockFiles.get('/mock/cache/audio_story-2.mp3')?.exists).toBe(false);
    expect(mockFiles.get('/mock/cache/cover_story-2.jpg')?.exists).toBe(false);
  });
});

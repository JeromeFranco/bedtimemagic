const mockFiles = new Map<string, { exists: boolean; lastModified: number; content?: number[] }>();

const mockBase64Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function mockBase64ToBytes(base64: string): number[] {
  const bytes: number[] = [];
  const clean = base64.replace(/=+$/, '');
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = mockBase64Alphabet.indexOf(clean[i]);
    const c1 = mockBase64Alphabet.indexOf(clean[i + 1]);
    const c2 = i + 2 < clean.length ? mockBase64Alphabet.indexOf(clean[i + 2]) : -1;
    const c3 = i + 3 < clean.length ? mockBase64Alphabet.indexOf(clean[i + 3]) : -1;
    bytes.push((c0 << 2) | (c1 >> 4));
    if (c2 >= 0) bytes.push(((c1 & 0x0f) << 4) | (c2 >> 2));
    if (c3 >= 0) bytes.push(((c2 & 0x03) << 6) | c3);
  }
  return bytes;
}

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

    write(content: string, options?: { encoding?: string; append?: boolean }) {
      const existing = mockFiles.get(this.uri);
      const bytes = options?.encoding === 'base64' ? mockBase64ToBytes(content) : [];
      const previous = options?.append && existing?.content ? existing.content : [];
      mockFiles.set(this.uri, {
        exists: true,
        lastModified: Date.now(),
        content: [...previous, ...bytes],
      });
      this.exists = true;
    }

    async move(dest: MockFile) {
      const entry = mockFiles.get(this.uri);
      if (!entry?.exists) throw new Error(`File does not exist: ${this.uri}`);
      mockFiles.delete(this.uri);
      mockFiles.set(dest.uri, entry);
      this.uri = dest.uri;
      this.name = dest.name;
      dest.exists = true;
    }

    delete() {
      mockFiles.set(this.uri, { exists: false, lastModified: 0 });
      this.exists = false;
    }

    static async downloadFileAsync(_url: string, dest: MockFile): Promise<MockFile> {
      mockFiles.set(dest.uri, { exists: true, lastModified: Date.now() });
      dest.exists = true;
      return dest;
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
  getCachedAudioSegmentPath,
  AudioSegmentWriter,
  getCachedAudioSegmentPaths,
} from '../audio-cache';

beforeEach(() => {
  mockFiles.clear();
});

describe('getCachedAudioPath', () => {
  it('returns path when file exists', async () => {
    mockFiles.set('/mock/cache/audio_v2_story-1.mp3', { exists: true, lastModified: 1000 });
    const result = await getCachedAudioPath('story-1');
    expect(result).toBe('/mock/cache/audio_v2_story-1.mp3');
  });

  it('returns null when file does not exist', async () => {
    const result = await getCachedAudioPath('story-1');
    expect(result).toBeNull();
  });
});

describe('writeAudioToCache', () => {
  it('writes base64 audio to mp3 file and returns path', async () => {
    const result = await writeAudioToCache('story-1', 'aGVsbG8=');
    expect(result).toBe('/mock/cache/audio_v2_story-1.mp3');
    expect(mockFiles.get('/mock/cache/audio_v2_story-1.mp3')?.exists).toBe(true);
  });
});

describe('evictStory', () => {
  it('deletes audio and cover when they exist', async () => {
    mockFiles.set('/mock/cache/audio_v2_story-1.mp3', { exists: true, lastModified: 1000 });
    mockFiles.set('/mock/cache/cover_story-1.jpg', { exists: true, lastModified: 1000 });

    await evictStory('story-1');

    expect(mockFiles.get('/mock/cache/audio_v2_story-1.mp3')?.exists).toBe(false);
    expect(mockFiles.get('/mock/cache/cover_story-1.jpg')?.exists).toBe(false);
  });

  it('also deletes legacy audio_ segment and whole-story files', async () => {
    mockFiles.set('/mock/cache/audio_story-1.mp3', { exists: true, lastModified: 1000 });
    mockFiles.set('/mock/cache/audio_story-1_0.mp3', { exists: true, lastModified: 1000 });
    mockFiles.set('/mock/cache/audio_story-1_1.mp3', { exists: true, lastModified: 1000 });
    mockFiles.set('/mock/cache/audio_v2_story-1_0.mp3', { exists: true, lastModified: 1000 });

    await evictStory('story-1');

    expect(mockFiles.get('/mock/cache/audio_story-1.mp3')?.exists).toBe(false);
    expect(mockFiles.get('/mock/cache/audio_story-1_0.mp3')?.exists).toBe(false);
    expect(mockFiles.get('/mock/cache/audio_story-1_1.mp3')?.exists).toBe(false);
    expect(mockFiles.get('/mock/cache/audio_v2_story-1_0.mp3')?.exists).toBe(false);
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
      mockFiles.set(`/mock/cache/audio_v2_story-${id}.mp3`, {
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
      mockFiles.set(`/mock/cache/audio_v2_story-${id}.mp3`, {
        exists: true,
        lastModified: parseInt(id) * 1000,
      });
      mockFiles.set(`/mock/cache/cover_story-${id}.jpg`, {
        exists: true,
        lastModified: parseInt(id) * 1000,
      });
    }

    await enforceFifoEviction();

    expect(mockFiles.get('/mock/cache/audio_v2_story-1.mp3')?.exists).toBe(false);
    expect(mockFiles.get('/mock/cache/cover_story-1.jpg')?.exists).toBe(false);
    expect(mockFiles.get('/mock/cache/audio_v2_story-2.mp3')?.exists).toBe(false);
    expect(mockFiles.get('/mock/cache/cover_story-2.jpg')?.exists).toBe(false);
  });

  it('groups and evicts legacy audio_ files alongside audio_v2_ files', async () => {
    // oldest story only has legacy-prefix files
    for (let seg = 0; seg < 3; seg++) {
      mockFiles.set(`/mock/cache/audio_story-1_${seg}.mp3`, { exists: true, lastModified: 1000 });
    }
    mockFiles.set('/mock/cache/audio_story-1.mp3', { exists: true, lastModified: 1000 });
    for (let story = 2; story <= 7; story++) {
      const ts = story * 1000;
      for (let seg = 0; seg < 3; seg++) {
        mockFiles.set(`/mock/cache/audio_v2_story-${story}_${seg}.mp3`, {
          exists: true,
          lastModified: ts,
        });
      }
    }

    await enforceFifoEviction();

    for (let seg = 0; seg < 3; seg++) {
      expect(mockFiles.get(`/mock/cache/audio_story-1_${seg}.mp3`)?.exists).toBe(false);
    }
    expect(mockFiles.get('/mock/cache/audio_story-1.mp3')?.exists).toBe(false);
    for (let story = 3; story <= 7; story++) {
      for (let seg = 0; seg < 3; seg++) {
        expect(mockFiles.get(`/mock/cache/audio_v2_story-${story}_${seg}.mp3`)?.exists).toBe(true);
      }
    }
  });
});

describe('getCachedAudioSegmentPath', () => {
  it('returns path when segment file exists', async () => {
    mockFiles.set('/mock/cache/audio_v2_story-1_0.mp3', { exists: true, lastModified: 1000 });
    const result = await getCachedAudioSegmentPath('story-1', 0);
    expect(result).toBe('/mock/cache/audio_v2_story-1_0.mp3');
  });

  it('returns null when segment file does not exist', async () => {
    const result = await getCachedAudioSegmentPath('story-1', 0);
    expect(result).toBeNull();
  });
});

describe('AudioSegmentWriter', () => {
  it('writes awkward-sized chunks and publishes bytes identical to the input', async () => {
    const total = 60 * 1024 + 1; // not divisible by 3
    const input = new Uint8Array(total);
    for (let i = 0; i < total; i++) input[i] = i % 251;

    const writer = new AudioSegmentWriter('story-1', 0);
    // chunk size not divisible by 3, forcing carry-over between base64 blocks
    for (let i = 0; i < input.length; i += 1000) {
      writer.write(input.subarray(i, Math.min(i + 1000, input.length)));
    }
    expect(mockFiles.get('/mock/cache/audio_v2_story-1_0.mp3.part')?.exists).toBe(true);

    const uri = await writer.finish();

    expect(uri).toBe('/mock/cache/audio_v2_story-1_0.mp3');
    expect(mockFiles.get('/mock/cache/audio_v2_story-1_0.mp3')?.content).toEqual(
      Array.from(input),
    );
    expect(mockFiles.has('/mock/cache/audio_v2_story-1_0.mp3.part')).toBe(false);
  });

  it('flushes incrementally to the part file instead of one giant write', async () => {
    const writer = new AudioSegmentWriter('story-1', 1);
    const chunk = new Uint8Array(30 * 1024).fill(7);
    writer.write(chunk);

    // 30KB exceeds the flush threshold, so bytes hit disk before finish()
    const part = mockFiles.get('/mock/cache/audio_v2_story-1_1.mp3.part');
    expect(part?.exists).toBe(true);
    expect(part?.content?.length).toBeGreaterThan(0);

    await writer.finish();
    expect(mockFiles.get('/mock/cache/audio_v2_story-1_1.mp3')?.content).toEqual(
      Array.from(chunk),
    );
  });

  it('abort removes the part file', async () => {
    const writer = new AudioSegmentWriter('story-1', 2);
    writer.write(new Uint8Array(30 * 1024));
    expect(mockFiles.get('/mock/cache/audio_v2_story-1_2.mp3.part')?.exists).toBe(true);

    writer.abort();

    expect(mockFiles.get('/mock/cache/audio_v2_story-1_2.mp3.part')?.exists ?? false).toBe(false);
    expect(mockFiles.get('/mock/cache/audio_v2_story-1_2.mp3')?.exists ?? false).toBe(false);
  });

  it('finish publishes an empty segment when no chunks were written', async () => {
    const writer = new AudioSegmentWriter('story-1', 3);
    const uri = await writer.finish();
    expect(uri).toBe('/mock/cache/audio_v2_story-1_3.mp3');
    expect(mockFiles.get('/mock/cache/audio_v2_story-1_3.mp3')?.exists).toBe(true);
    expect(mockFiles.has('/mock/cache/audio_v2_story-1_3.mp3.part')).toBe(false);
  });
});

describe('getCachedAudioSegmentPaths', () => {
  it('returns paths for existing segments and null for missing', async () => {
    mockFiles.set('/mock/cache/audio_v2_story-1_0.mp3', { exists: true, lastModified: 1000 });
    mockFiles.set('/mock/cache/audio_v2_story-1_2.mp3', { exists: true, lastModified: 1000 });
    const result = await getCachedAudioSegmentPaths('story-1', 3);
    expect(result).toEqual([
      '/mock/cache/audio_v2_story-1_0.mp3',
      null,
      '/mock/cache/audio_v2_story-1_2.mp3',
    ]);
  });
});

describe('story-level FIFO eviction with segments', () => {
  it('evicts all segments for oldest stories, keeps newest', async () => {
    for (let story = 1; story <= 7; story++) {
      const ts = story * 1000;
      for (let seg = 0; seg < 3; seg++) {
        mockFiles.set(`/mock/cache/audio_v2_story-${story}_${seg}.mp3`, {
          exists: true,
          lastModified: ts,
        });
      }
      mockFiles.set(`/mock/cache/cover_story-${story}.jpg`, {
        exists: true,
        lastModified: ts,
      });
    }

    await enforceFifoEviction();

    for (let seg = 0; seg < 3; seg++) {
      expect(mockFiles.get(`/mock/cache/audio_v2_story-1_${seg}.mp3`)?.exists).toBe(false);
      expect(mockFiles.get(`/mock/cache/audio_v2_story-2_${seg}.mp3`)?.exists).toBe(false);
    }
    expect(mockFiles.get('/mock/cache/cover_story-1.jpg')?.exists).toBe(false);
    expect(mockFiles.get('/mock/cache/cover_story-2.jpg')?.exists).toBe(false);

    for (let story = 3; story <= 7; story++) {
      for (let seg = 0; seg < 3; seg++) {
        expect(mockFiles.get(`/mock/cache/audio_v2_story-${story}_${seg}.mp3`)?.exists).toBe(true);
      }
      expect(mockFiles.get(`/mock/cache/cover_story-${story}.jpg`)?.exists).toBe(true);
    }
  });
});

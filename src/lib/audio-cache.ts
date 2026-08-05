import { File, Paths, EncodingType } from 'expo-file-system';

export const AUDIO_CACHE_PREFIX = 'audio_v2_';
// pre-v2 cache files; kept in sync with eviction so old caches get swept
const LEGACY_AUDIO_CACHE_PREFIX = 'audio_';
const COVER_CACHE_PREFIX = 'cover_';
const MAX_CACHED_STORIES = 5;
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function audioPath(storyId: string): string {
  return new File(Paths.cache, `${AUDIO_CACHE_PREFIX}${storyId}.mp3`).uri;
}

function audioSegmentPath(storyId: string, segmentIndex: number): string {
  return new File(Paths.cache, `${AUDIO_CACHE_PREFIX}${storyId}_${segmentIndex}.mp3`).uri;
}

function coverPath(storyId: string): string {
  return new File(Paths.cache, `${COVER_CACHE_PREFIX}${storyId}.jpg`).uri;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chars: string[] = [];
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    chars.push(
      BASE64_CHARS[b0 >> 2],
      BASE64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)],
      i + 1 < bytes.length ? BASE64_CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)] : '=',
      i + 2 < bytes.length ? BASE64_CHARS[b2 & 0x3f] : '=',
    );
  }
  return chars.join('');
}

export async function getCachedAudioPath(storyId: string): Promise<string | null> {
  const file = new File(audioPath(storyId));
  return file.exists ? file.uri : null;
}

export async function writeAudioToCache(
  storyId: string,
  audioBase64: string
): Promise<string> {
  const file = new File(audioPath(storyId));
  file.write(audioBase64, { encoding: EncodingType.Base64 });
  return file.uri;
}

export async function getCachedAudioSegmentPath(
  storyId: string,
  segmentIndex: number
): Promise<string | null> {
  const file = new File(audioSegmentPath(storyId, segmentIndex));
  return file.exists ? file.uri : null;
}

const SEGMENT_WRITE_FLUSH_BYTES = 24 * 1024;

/**
 * Streams TTS audio chunks to a temp `.part` file and atomically publishes
 * the final `.mp3` on finish, so cache-hit checks never see truncated files.
 */
export class AudioSegmentWriter {
  private readonly partFile: File;
  private readonly finalFile: File;
  private pending = new Uint8Array(0);
  private hasWritten = false;

  constructor(storyId: string, segmentIndex: number) {
    this.partFile = new File(
      Paths.cache,
      `${AUDIO_CACHE_PREFIX}${storyId}_${segmentIndex}.mp3.part`,
    );
    this.finalFile = new File(audioSegmentPath(storyId, segmentIndex));
  }

  private flush(bytes: Uint8Array): void {
    if (bytes.length === 0) return;
    this.partFile.write(uint8ArrayToBase64(bytes), {
      encoding: EncodingType.Base64,
      append: this.hasWritten,
    });
    this.hasWritten = true;
  }

  write(chunk: Uint8Array): void {
    const merged = new Uint8Array(this.pending.length + chunk.length);
    merged.set(this.pending, 0);
    merged.set(chunk, this.pending.length);
    this.pending = merged;

    // keep 1-2 trailing bytes so every appended base64 block is 3-byte
    // aligned, which is required for a valid concatenated base64 stream
    const flushableLength = this.pending.length - (this.pending.length % 3);
    if (flushableLength >= SEGMENT_WRITE_FLUSH_BYTES) {
      const flushable = this.pending.slice(0, flushableLength);
      this.pending = this.pending.slice(flushableLength);
      this.flush(flushable);
    }
  }

  async finish(): Promise<string> {
    // the final block may be 1-2 bytes (padding goes at the very end)
    this.flush(this.pending);
    this.pending = new Uint8Array(0);
    if (!this.hasWritten) {
      this.partFile.write('', { encoding: EncodingType.Base64 });
    }
    await this.partFile.move(this.finalFile);
    return this.finalFile.uri;
  }

  abort(): void {
    this.pending = new Uint8Array(0);
    this.hasWritten = false;
    if (this.partFile.exists) {
      this.partFile.delete();
    }
  }
}

export async function getCachedAudioSegmentPaths(
  storyId: string,
  segmentCount: number
): Promise<(string | null)[]> {
  const results: (string | null)[] = [];
  for (let i = 0; i < segmentCount; i++) {
    const file = new File(audioSegmentPath(storyId, i));
    results.push(file.exists ? file.uri : null);
  }
  return results;
}

export async function getCachedCoverPath(storyId: string): Promise<string | null> {
  const file = new File(coverPath(storyId));
  return file.exists ? file.uri : null;
}

export async function cacheCoverImage(storyId: string, imageUrl: string): Promise<string> {
  const file = new File(coverPath(storyId));
  await File.downloadFileAsync(imageUrl, file);
  return file.uri;
}

export async function evictStory(storyId: string): Promise<void> {
  if (!Paths.cache.exists) return;

  const files = Paths.cache.list();
  const storyPrefixes = [
    `${AUDIO_CACHE_PREFIX}${storyId}_`,
    `${LEGACY_AUDIO_CACHE_PREFIX}${storyId}_`,
  ];
  for (const f of files) {
    if (
      f instanceof File &&
      storyPrefixes.some((prefix) => f.name.startsWith(prefix)) &&
      f.name.endsWith('.mp3')
    ) {
      if (f.exists) f.delete();
    }
  }

  for (const prefix of [AUDIO_CACHE_PREFIX, LEGACY_AUDIO_CACHE_PREFIX]) {
    const whole = new File(Paths.cache, `${prefix}${storyId}.mp3`);
    if (whole.exists) whole.delete();
  }

  const cover = new File(coverPath(storyId));
  if (cover.exists) cover.delete();
}

export async function enforceFifoEviction(): Promise<void> {
  if (!Paths.cache.exists) return;

  const files = Paths.cache.list();
  // legacy prefix is a prefix of the current one, so this covers both
  const audioFiles = files
    .filter((f): f is File => f instanceof File)
    .filter((f) => f.name.startsWith(LEGACY_AUDIO_CACHE_PREFIX) && f.name.endsWith('.mp3'));

  const storyGroups = new Map<string, { files: File[]; oldestModified: number }>();
  for (const f of audioFiles) {
    const prefix = f.name.startsWith(AUDIO_CACHE_PREFIX)
      ? AUDIO_CACHE_PREFIX
      : LEGACY_AUDIO_CACHE_PREFIX;
    const base = f.name.slice(prefix.length, f.name.length - '.mp3'.length);
    const lastUnderscore = base.lastIndexOf('_');
    const storyId = lastUnderscore > 0 ? base.slice(0, lastUnderscore) : base;
    const mod = f.lastModified ?? 0;
    const group = storyGroups.get(storyId);
    if (group) {
      group.files.push(f);
      if (mod < group.oldestModified) group.oldestModified = mod;
    } else {
      storyGroups.set(storyId, { files: [f], oldestModified: mod });
    }
  }

  if (storyGroups.size <= MAX_CACHED_STORIES) return;

  const sorted = Array.from(storyGroups.entries()).sort(
    ([, a], [, b]) => a.oldestModified - b.oldestModified
  );

  const toEvict = sorted.slice(0, storyGroups.size - MAX_CACHED_STORIES);
  for (const [storyId] of toEvict) {
    await evictStory(storyId);
  }
}

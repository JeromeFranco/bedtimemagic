import {
  cacheDirectory,
  getInfoAsync,
  writeAsStringAsync,
  readAsStringAsync,
  deleteAsync,
  readDirectoryAsync,
  EncodingType,
} from 'expo-file-system/legacy';

export const AUDIO_CACHE_PREFIX = 'audio_';
const COVER_CACHE_PREFIX = 'cover_';
const MAX_CACHED_STORIES = 5;
const WAV_HEADER_SIZE = 44;

const pendingChunks = new Map<string, string[]>();

function audioPath(storyId: string): string {
  return `${cacheDirectory}${AUDIO_CACHE_PREFIX}${storyId}.wav`;
}

function coverPath(storyId: string): string {
  return `${cacheDirectory}${COVER_CACHE_PREFIX}${storyId}.jpg`;
}

export async function getCachedAudioPath(storyId: string): Promise<string | null> {
  const path = audioPath(storyId);
  const info = await getInfoAsync(path);
  return info.exists ? path : null;
}

export async function writeAudioChunk(storyId: string, chunkBase64: string): Promise<void> {
  const chunks = pendingChunks.get(storyId) ?? [];
  chunks.push(chunkBase64);
  pendingChunks.set(storyId, chunks);
}

export function discardPendingChunks(storyId: string): void {
  pendingChunks.delete(storyId);
}

export async function writeSentenceToCache(
  storyId: string,
  index: number,
  audioBase64: string
): Promise<void> {
  const path = audioPath(storyId);

  if (index === 0) {
    await writeAsStringAsync(path, audioBase64, {
      encoding: EncodingType.Base64,
    });
  } else {
    const pcmBase64 = audioBase64.slice(Math.ceil(WAV_HEADER_SIZE * 4 / 3));
    const existing = await readAsStringAsync(path, { encoding: EncodingType.Base64 });
    await writeAsStringAsync(path, existing + pcmBase64, {
      encoding: EncodingType.Base64,
    });
  }
}

export async function finalizeAudioCache(storyId: string): Promise<string> {
  const path = audioPath(storyId);
  const chunks = pendingChunks.get(storyId);
  if (chunks && chunks.length > 0) {
    await writeAsStringAsync(path, chunks.join(''), {
      encoding: EncodingType.Base64,
    });
    pendingChunks.delete(storyId);
  }
  return path;
}

export async function evictStory(storyId: string): Promise<void> {
  const audio = audioPath(storyId);
  const cover = coverPath(storyId);

  const audioInfo = await getInfoAsync(audio);
  if (audioInfo.exists) {
    await deleteAsync(audio);
  }

  const coverInfo = await getInfoAsync(cover);
  if (coverInfo.exists) {
    await deleteAsync(cover);
  }
}

export async function enforceFifoEviction(): Promise<void> {
  if (!cacheDirectory) return;

  const files = await readDirectoryAsync(cacheDirectory);
  const audioFiles = files.filter((f) => f.startsWith(AUDIO_CACHE_PREFIX) && f.endsWith('.wav'));

  if (audioFiles.length <= MAX_CACHED_STORIES) return;

  const withTimes = await Promise.all(
    audioFiles.map(async (file) => {
      const info = await getInfoAsync(`${cacheDirectory}${file}`);
      return {
        file,
        modificationTime: 'modificationTime' in info ? (info.modificationTime as number) : 0,
      };
    })
  );

  withTimes.sort((a, b) => a.modificationTime - b.modificationTime);

  const toEvict = withTimes.slice(0, audioFiles.length - MAX_CACHED_STORIES);
  for (const { file } of toEvict) {
    const storyId = file.replace(AUDIO_CACHE_PREFIX, '').replace('.wav', '');
    await evictStory(storyId);
  }
}

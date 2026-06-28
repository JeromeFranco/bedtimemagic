import {
  cacheDirectory,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  readDirectoryAsync,
  EncodingType,
} from 'expo-file-system';

export const AUDIO_CACHE_PREFIX = 'audio_';
const COVER_CACHE_PREFIX = 'cover_';
const MAX_CACHED_STORIES = 5;

function audioPath(storyId: string): string {
  return `${cacheDirectory}${AUDIO_CACHE_PREFIX}${storyId}.mp3`;
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
  const path = audioPath(storyId);
  const info = await getInfoAsync(path);

  if (info.exists) {
    const existing = await readAsStringAsync(path, {
      encoding: EncodingType.Base64,
    });
    await writeAsStringAsync(path, existing + chunkBase64, {
      encoding: EncodingType.Base64,
    });
  } else {
    await writeAsStringAsync(path, chunkBase64, {
      encoding: EncodingType.Base64,
    });
  }
}

export async function finalizeAudioCache(storyId: string): Promise<string> {
  return audioPath(storyId);
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
  const files = await readDirectoryAsync(cacheDirectory!);
  const audioFiles = files.filter((f) => f.startsWith(AUDIO_CACHE_PREFIX));

  if (audioFiles.length <= MAX_CACHED_STORIES) return;

  const withTimes = await Promise.all(
    audioFiles.map(async (file) => {
      const info = await getInfoAsync(
        `${cacheDirectory}${file}`
      );
      return { file, modificationTime: (info as any).modificationTime ?? 0 };
    })
  );

  withTimes.sort((a, b) => a.modificationTime - b.modificationTime);

  const toEvict = withTimes.slice(0, audioFiles.length - MAX_CACHED_STORIES);

  for (const { file } of toEvict) {
    const storyId = file.replace(AUDIO_CACHE_PREFIX, '').replace('.mp3', '');
    await evictStory(storyId);
  }
}

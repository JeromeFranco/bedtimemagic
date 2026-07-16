import {
  cacheDirectory,
  getInfoAsync,
  writeAsStringAsync,
  deleteAsync,
  readDirectoryAsync,
  EncodingType,
} from 'expo-file-system/legacy';

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

export async function writeAudioToCache(
  storyId: string,
  audioBase64: string
): Promise<string> {
  const path = audioPath(storyId);
  await writeAsStringAsync(path, audioBase64, {
    encoding: EncodingType.Base64,
  });
  return path;
}

export async function getCachedCoverPath(storyId: string): Promise<string | null> {
  const path = coverPath(storyId);
  const info = await getInfoAsync(path);
  return info.exists ? path : null;
}

export async function cacheCoverImage(storyId: string, imageUrl: string): Promise<string> {
  const path = coverPath(storyId);
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve) => {
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
  const base64Data = base64.split(',')[1];
  await writeAsStringAsync(path, base64Data, { encoding: EncodingType.Base64 });
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
  const audioFiles = files.filter((f) => f.startsWith(AUDIO_CACHE_PREFIX) && f.endsWith('.mp3'));

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
    const storyId = file.replace(AUDIO_CACHE_PREFIX, '').replace('.mp3', '');
    await evictStory(storyId);
  }
}

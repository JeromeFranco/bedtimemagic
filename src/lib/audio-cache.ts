import { File, Paths, EncodingType } from 'expo-file-system';

export const AUDIO_CACHE_PREFIX = 'audio_';
const COVER_CACHE_PREFIX = 'cover_';
const MAX_CACHED_STORIES = 5;

function audioPath(storyId: string): string {
  return new File(Paths.cache, `${AUDIO_CACHE_PREFIX}${storyId}.mp3`).uri;
}

function coverPath(storyId: string): string {
  return new File(Paths.cache, `${COVER_CACHE_PREFIX}${storyId}.jpg`).uri;
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

export async function getCachedCoverPath(storyId: string): Promise<string | null> {
  const file = new File(coverPath(storyId));
  return file.exists ? file.uri : null;
}

export async function cacheCoverImage(storyId: string, imageUrl: string): Promise<string> {
  const file = new File(coverPath(storyId));
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve) => {
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
  const base64Data = base64.split(',')[1];
  file.write(base64Data, { encoding: EncodingType.Base64 });
  return file.uri;
}

export async function evictStory(storyId: string): Promise<void> {
  const audio = new File(audioPath(storyId));
  const cover = new File(coverPath(storyId));

  if (audio.exists) {
    audio.delete();
  }

  if (cover.exists) {
    cover.delete();
  }
}

export async function enforceFifoEviction(): Promise<void> {
  if (!Paths.cache.exists) return;

  const files = Paths.cache.list();
  const audioFiles = files
    .filter((f): f is File => f instanceof File)
    .filter((f) => f.name.startsWith(AUDIO_CACHE_PREFIX) && f.name.endsWith('.mp3'));

  if (audioFiles.length <= MAX_CACHED_STORIES) return;

  const withTimes = audioFiles.map((file) => ({
    file,
    modificationTime: file.lastModified ?? 0,
  }));

  withTimes.sort((a, b) => a.modificationTime - b.modificationTime);

  const toEvict = withTimes.slice(0, audioFiles.length - MAX_CACHED_STORIES);
  for (const { file } of toEvict) {
    const storyId = file.name.replace(AUDIO_CACHE_PREFIX, '').replace('.mp3', '');
    await evictStory(storyId);
  }
}

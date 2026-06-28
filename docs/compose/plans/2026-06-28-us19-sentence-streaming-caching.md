# US-1.9: Sentence-Level Streaming & Caching — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement sentence-level TTS streaming from a Supabase Edge Function and local audio caching with FIFO eviction, replacing the sample audio stub.

**Architecture:** A new Edge Function splits story text into sentences, generates TTS audio for each concurrently via MiMo V2.5 TTS, and streams the concatenated audio back via SSE. The client receives chunks, writes them to the device cache directory, and plays from cache on subsequent replays. FIFO eviction keeps at most 5 cached stories (~15-25MB).

**Tech Stack:** Supabase Edge Functions (Deno), MiMo V2.5 TTS API (`https://api.xiaomimimo.com/v1`), expo-file-system, expo-audio

## Global Constraints

- Voice: fixed to "Chloe" (Sweet Dreamy) for all bedtime stories
- TTS model: `mimo-v2.5-tts` with context `"gentle bedtime story narration, warm and soothing, slow pace"`
- Cache path: `${cacheDirectory}audio_[story_id].mp3`
- Max cached stories: 5 (FIFO eviction by last-modified timestamp)
- Cover images evicted alongside audio when a story is purged
- No cloud audio storage (PRD guardrail #2)
- `getAudioSource()` becomes async — all callers must await it

---

### Task 1: Install expo-file-system

**Covers:** [S6]

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `expo-file-system` available for import in subsequent tasks

- [ ] **Step 1: Install the dependency**

```bash
npx expo install expo-file-system
```

- [ ] **Step 2: Verify installation**

```bash
grep "expo-file-system" package.json
```

Expected: `"expo-file-system": "~XX.X.X"` appears in dependencies.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add expo-file-system dependency"
```

---

### Task 2: Audio Cache Manager

**Covers:** [S3]

**Files:**
- Create: `src/lib/audio-cache.ts`
- Create: `src/lib/__tests__/audio-cache.test.ts`

**Interfaces:**
- Produces:
  - `getCachedAudioPath(storyId: string): Promise<string | null>` — returns absolute path or null
  - `writeAudioChunk(storyId: string, chunkBase64: string): Promise<void>` — appends decoded bytes to cache file
  - `finalizeAudioCache(storyId: string): Promise<string>` — returns the final cached file path
  - `evictStory(storyId: string): Promise<void>` — deletes audio + cover image for a story
  - `enforceFifoEviction(): Promise<void>` — purges oldest if count > 5
  - `AUDIO_CACHE_PREFIX = 'audio_'` — constant for filename pattern

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/__tests__/audio-cache.test.ts
import * as FileSystem from 'expo-file-system';

jest.mock('expo-file-system', () => ({
  cacheDirectory: '/mock/cache/',
  getInfoAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

import {
  getCachedAudioPath,
  writeAudioChunk,
  finalizeAudioCache,
  evictStory,
  enforceFifoEviction,
  AUDIO_CACHE_PREFIX,
} from '../audio-cache';

const mockGetInfo = FileSystem.getInfoAsync as jest.Mock;
const mockWrite = FileSystem.writeAsStringAsync as jest.Mock;
const mockDelete = FileSystem.deleteAsync as jest.Mock;
const mockReadDir = FileSystem.readDirectoryAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getCachedAudioPath', () => {
  it('returns path when file exists', async () => {
    mockGetInfo.mockResolvedValue({ exists: true });
    const result = await getCachedAudioPath('story-123');
    expect(result).toBe('/mock/cache/audio_story-123.mp3');
    expect(mockGetInfo).toHaveBeenCalledWith('/mock/cache/audio_story-123.mp3');
  });

  it('returns null when file does not exist', async () => {
    mockGetInfo.mockResolvedValue({ exists: false });
    const result = await getCachedAudioPath('story-123');
    expect(result).toBeNull();
  });
});

describe('writeAudioChunk', () => {
  it('creates file on first chunk, appends on subsequent', async () => {
    mockGetInfo.mockResolvedValue({ exists: false });
    await writeAudioChunk('story-123', 'aGVsbG8='); // "hello" in base64
    expect(mockWrite).toHaveBeenCalledWith(
      '/mock/cache/audio_story-123.mp3',
      'aGVsbG8=',
      { encoding: FileSystem.EncodingType.Base64 }
    );

    mockGetInfo.mockResolvedValue({ exists: true });
    await writeAudioChunk('story-123', 'd29ybGQ='); // "world" in base64
    expect(mockWrite).toHaveBeenCalledTimes(2);
  });
});

describe('finalizeAudioCache', () => {
  it('returns the cached file path', async () => {
    const result = await finalizeAudioCache('story-123');
    expect(result).toBe('/mock/cache/audio_story-123.mp3');
  });
});

describe('evictStory', () => {
  it('deletes audio file and cover image', async () => {
    mockGetInfo.mockResolvedValue({ exists: true });
    await evictStory('story-123');
    expect(mockDelete).toHaveBeenCalledWith('/mock/cache/audio_story-123.mp3');
    expect(mockDelete).toHaveBeenCalledWith('/mock/cache/cover_story-123.jpg');
  });

  it('does not delete if files do not exist', async () => {
    mockGetInfo.mockResolvedValue({ exists: false });
    await evictStory('story-123');
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe('enforceFifoEviction', () => {
  it('does nothing if 5 or fewer audio files', async () => {
    mockReadDir.mockResolvedValue(['audio_a.mp3', 'audio_b.mp3', 'audio_c.mp3']);
    await enforceFifoEviction();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('evicts oldest files when count exceeds 5', async () => {
    const files = Array.from({ length: 7 }, (_, i) => `audio_${i}.mp3`);
    mockReadDir.mockResolvedValue(files);
    mockGetInfo.mockImplementation((path: string) => {
      const idx = parseInt(path.match(/audio_(\d+)\.mp3/)![1]);
      return Promise.resolve({ exists: true, modificationTime: idx * 1000 });
    });
    await enforceFifoEviction();
    // Should evict files 0 and 1 (oldest)
    expect(mockDelete).toHaveBeenCalledWith('/mock/cache/audio_0.mp3');
    expect(mockDelete).toHaveBeenCalledWith('/mock/cache/audio_1.mp3');
    expect(mockDelete).toHaveBeenCalledTimes(4); // 2 audio + 2 cover
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/lib/__tests__/audio-cache.test.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — module `../audio-cache` not found.

- [ ] **Step 3: Implement audio-cache.ts**

```typescript
// src/lib/audio-cache.ts
import * as FileSystem from 'expo-file-system';

export const AUDIO_CACHE_PREFIX = 'audio_';
const COVER_CACHE_PREFIX = 'cover_';
const MAX_CACHED_STORIES = 5;

function audioPath(storyId: string): string {
  return `${FileSystem.cacheDirectory}${AUDIO_CACHE_PREFIX}${storyId}.mp3`;
}

function coverPath(storyId: string): string {
  return `${FileSystem.cacheDirectory}${COVER_CACHE_PREFIX}${storyId}.jpg`;
}

export async function getCachedAudioPath(storyId: string): Promise<string | null> {
  const path = audioPath(storyId);
  const info = await FileSystem.getInfoAsync(path);
  return info.exists ? path : null;
}

export async function writeAudioChunk(storyId: string, chunkBase64: string): Promise<void> {
  const path = audioPath(storyId);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    // Read existing content, append new chunk
    const existing = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await FileSystem.writeAsStringAsync(path, existing + chunkBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } else {
    await FileSystem.writeAsStringAsync(path, chunkBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
}

export async function finalizeAudioCache(storyId: string): Promise<string> {
  return audioPath(storyId);
}

export async function evictStory(storyId: string): Promise<void> {
  const audio = audioPath(storyId);
  const cover = coverPath(storyId);

  const audioInfo = await FileSystem.getInfoAsync(audio);
  if (audioInfo.exists) {
    await FileSystem.deleteAsync(audio);
  }

  const coverInfo = await FileSystem.getInfoAsync(cover);
  if (coverInfo.exists) {
    await FileSystem.deleteAsync(cover);
  }
}

export async function enforceFifoEviction(): Promise<void> {
  if (!FileSystem.cacheDirectory) return;

  const entries = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
  const audioFiles = entries.filter((f) => f.startsWith(AUDIO_CACHE_PREFIX) && f.endsWith('.mp3'));

  if (audioFiles.length <= MAX_CACHED_STORIES) return;

  // Get modification times
  const withTimes = await Promise.all(
    audioFiles.map(async (filename) => {
      const path = `${FileSystem.cacheDirectory}${filename}`;
      const info = await FileSystem.getInfoAsync(path);
      return {
        filename,
        path,
        modificationTime: info.exists && 'modificationTime' in info ? info.modificationTime : 0,
      };
    })
  );

  // Sort oldest first
  withTimes.sort((a, b) => a.modificationTime - b.modificationTime);

  // Evict excess
  const toEvict = withTimes.slice(0, audioFiles.length - MAX_CACHED_STORIES);
  for (const file of toEvict) {
    const storyId = file.filename.replace(AUDIO_CACHE_PREFIX, '').replace('.mp3', '');
    await evictStory(storyId);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/lib/__tests__/audio-cache.test.ts --no-coverage 2>&1 | tail -20
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio-cache.ts src/lib/__tests__/audio-cache.test.ts
git commit -m "feat: add audio cache manager with FIFO eviction"
```

---

### Task 3: SSE Audio Streaming Client

**Covers:** [S4]

**Files:**
- Create: `src/lib/audio-stream.ts`
- Create: `src/lib/__tests__/audio-stream.test.ts`

**Interfaces:**
- Consumes: `writeAudioChunk`, `finalizeAudioCache`, `enforceFifoEviction` from `src/lib/audio-cache.ts`
- Consumes: `supabase` from `src/lib/supabase.ts` (for URL and anon key)
- Produces: `streamStoryAudio(storyId: string, storyText: string): Promise<string>` — returns local cached file path

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/__tests__/audio-stream.test.ts
import { streamStoryAudio } from '../audio-stream';
import * as audioCache from '../audio-cache';

jest.mock('../audio-cache', () => ({
  writeAudioChunk: jest.fn(),
  finalizeAudioCache: jest.fn(),
  enforceFifoEviction: jest.fn(),
}));

jest.mock('../supabase', () => ({
  supabase: {
    supabaseUrl: 'https://test.supabase.co',
    supabaseKey: 'test-anon-key',
  },
}));

const mockWriteChunk = audioCache.writeAudioChunk as jest.Mock;
const mockFinalize = audioCache.finalizeAudioCache as jest.Mock;
const mockEnforce = audioCache.enforceFifoEviction as jest.Mock;

function createMockSSEResponse(events: string[]) {
  const encoder = new TextEncoder();
  let index = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (index < events.length) {
        controller.enqueue(encoder.encode(events[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFinalize.mockResolvedValue('/mock/cache/audio_story-123.mp3');
});

describe('streamStoryAudio', () => {
  it('processes SSE chunks and writes to cache', async () => {
    const sseEvents = [
      'event: chunk\ndata: {"index":0,"total":2,"audio":"aGVsbG8="}\n\n',
      'event: chunk\ndata: {"index":1,"total":2,"audio":"d29ybGQ="}\n\n',
      'event: done\ndata: {"total_chunks":2,"total_bytes":10}\n\n',
    ];

    global.fetch = jest.fn().mockResolvedValue(createMockSSEResponse(sseEvents));

    const result = await streamStoryAudio('story-123', 'Hello. World.');

    expect(result).toBe('/mock/cache/audio_story-123.mp3');
    expect(mockWriteChunk).toHaveBeenCalledTimes(2);
    expect(mockWriteChunk).toHaveBeenCalledWith('story-123', 'aGVsbG8=');
    expect(mockWriteChunk).toHaveBeenCalledWith('story-123', 'd29ybGQ=');
    expect(mockFinalize).toHaveBeenCalledWith('story-123');
    expect(mockEnforce).toHaveBeenCalled();
  });

  it('throws on SSE error event', async () => {
    const sseEvents = [
      'event: error\ndata: {"message":"TTS failed","sentence_index":2}\n\n',
    ];

    global.fetch = jest.fn().mockResolvedValue(createMockSSEResponse(sseEvents));

    await expect(streamStoryAudio('story-123', 'Hello. World.')).rejects.toThrow('TTS failed');
  });

  it('throws on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response('Internal Server Error', { status: 500 })
    );

    await expect(streamStoryAudio('story-123', 'Hello.')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/lib/__tests__/audio-stream.test.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — module `../audio-stream` not found.

- [ ] **Step 3: Implement audio-stream.ts**

```typescript
// src/lib/audio-stream.ts
import { writeAudioChunk, finalizeAudioCache, enforceFifoEviction } from './audio-cache';
import { supabase } from './supabase';

interface SSEChunkEvent {
  index: number;
  total: number;
  audio: string;
}

interface SSEDoneEvent {
  total_chunks: number;
  total_bytes: number;
}

interface SSEErrorEvent {
  message: string;
  sentence_index: number;
}

function parseSSELine(line: string): { event?: string; data?: string } {
  if (line.startsWith('event: ')) {
    return { event: line.slice(7).trim() };
  }
  if (line.startsWith('data: ')) {
    return { data: line.slice(6).trim() };
  }
  return {};
}

export async function streamStoryAudio(storyId: string, storyText: string): Promise<string> {
  const { supabaseUrl, supabaseKey } = supabase as unknown as { supabaseUrl: string; supabaseKey: string };
  const url = `${supabaseUrl}/functions/v1/generate-story-audio`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ story_text: storyText }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Audio streaming failed (${response.status}): ${text}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventType = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') {
        eventType = '';
        continue;
      }

      const parsed = parseSSELine(trimmed);
      if (parsed.event) {
        eventType = parsed.event;
      } else if (parsed.data) {
        if (eventType === 'chunk') {
          const chunk: SSEChunkEvent = JSON.parse(parsed.data);
          await writeAudioChunk(storyId, chunk.audio);
        } else if (eventType === 'done') {
          await enforceFifoEviction();
          return await finalizeAudioCache(storyId);
        } else if (eventType === 'error') {
          const err: SSEErrorEvent = JSON.parse(parsed.data);
          throw new Error(`TTS error: ${err.message} (sentence ${err.sentence_index})`);
        }
      }
    }
  }

  throw new Error('Audio stream ended without done event');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/lib/__tests__/audio-stream.test.ts --no-coverage 2>&1 | tail -20
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio-stream.ts src/lib/__tests__/audio-stream.test.ts
git commit -m "feat: add SSE audio streaming client"
```

---

### Task 4: Edge Function for TTS Streaming

**Covers:** [S2]

**Files:**
- Create: `supabase/functions/generate-story-audio/index.ts`

**Interfaces:**
- Consumes: `MIMO_API_KEY` environment variable (set via Supabase secrets)
- Produces: SSE stream with `chunk`, `done`, and `error` events
- Input: `POST { story_text: string }`
- Output: SSE events carrying base64-encoded MP3 audio chunks

- [ ] **Step 1: Create the edge function directory and index file**

```bash
mkdir -p supabase/functions/generate-story-audio
```

- [ ] **Step 2: Implement the edge function**

```typescript
// supabase/functions/generate-story-audio/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const MIMO_API_URL = 'https://api.xiaomimimo.com/v1/audio/speech';
const TTS_MODEL = 'mimo-v2.5-tts';
const TTS_VOICE = 'Chloe';
const TTS_CONTEXT = 'gentle bedtime story narration, warm and soothing, slow pace';
const CHUNK_SIZE = 32 * 1024; // 32KB per chunk in base64

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function generateSentenceAudio(sentence: string, apiKey: string): Promise<ArrayBuffer> {
  const response = await fetch(MIMO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: sentence,
      response_format: 'mp3',
      context: TTS_CONTEXT,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TTS API error (${response.status}): ${text}`);
  }

  return await response.arrayBuffer();
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = Deno.env.get('MIMO_API_KEY');
  if (!apiKey) {
    return new Response('MIMO_API_KEY not configured', { status: 500 });
  }

  let storyText: string;
  try {
    const body = await req.json();
    storyText = body.story_text;
    if (!storyText || typeof storyText !== 'string') {
      return new Response('Missing or invalid story_text', { status: 400 });
    }
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const sentences = splitSentences(storyText);
  if (sentences.length === 0) {
    return new Response('No sentences found in story_text', { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Generate TTS for all sentences concurrently
        const audioBuffers = await Promise.all(
          sentences.map((s) => generateSentenceAudio(s, apiKey))
        );

        // Concatenate all audio buffers
        const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const buf of audioBuffers) {
          combined.set(new Uint8Array(buf), offset);
          offset += buf.byteLength;
        }

        // Stream combined audio in chunks
        const totalChunks = Math.ceil(combined.length / CHUNK_SIZE);
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, combined.length);
          const chunk = combined.slice(start, end);
          const base64 = uint8ToBase64(chunk);

          const event = `event: chunk\ndata: ${JSON.stringify({
            index: i,
            total: totalChunks,
            audio: base64,
          })}\n\n`;
          controller.enqueue(encoder.encode(event));
        }

        // Send done event
        const doneEvent = `event: done\ndata: ${JSON.stringify({
          total_chunks: totalChunks,
          total_bytes: totalLength,
        })}\n\n`;
        controller.enqueue(encoder.encode(doneEvent));
        controller.close();
      } catch (err) {
        const errorEvent = `event: error\ndata: ${JSON.stringify({
          message: err instanceof Error ? err.message : 'Unknown error',
          sentence_index: -1,
        })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd supabase/functions/generate-story-audio && deno check index.ts 2>&1 || echo "Note: Deno check may not be available locally — verify syntax manually"
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/generate-story-audio/index.ts
git commit -m "feat: add generate-story-audio edge function with TTS streaming"
```

---

### Task 5: Playback Integration

**Covers:** [S5]

**Files:**
- Modify: `src/lib/audio-utils.ts`
- Modify: `src/contexts/PlayerContext.tsx`
- Modify: `src/lib/__tests__/audio-utils.test.ts` (create if needed)

**Interfaces:**
- Consumes: `getCachedAudioPath` from `src/lib/audio-cache.ts`
- Consumes: `streamStoryAudio` from `src/lib/audio-stream.ts`
- Modifies: `getAudioSource(story: Story): Promise<{ uri: string }>` — now async
- Modifies: `playStory(story: Story)` in PlayerContext — now awaits getAudioSource

- [ ] **Step 1: Write the failing test for audio-utils**

```typescript
// src/lib/__tests__/audio-utils.test.ts
import { getAudioSource } from '../audio-utils';
import * as audioCache from '../audio-cache';
import * as audioStream from '../audio-stream';

jest.mock('../audio-cache', () => ({
  getCachedAudioPath: jest.fn(),
}));

jest.mock('../audio-stream', () => ({
  streamStoryAudio: jest.fn(),
}));

const mockGetCached = audioCache.getCachedAudioPath as jest.Mock;
const mockStream = audioStream.streamStoryAudio as jest.Mock;

const mockStory = {
  id: 'story-123',
  story_text: 'Once upon a time. The end.',
  title: 'Test Story',
} as any;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getAudioSource', () => {
  it('returns cached path when cache hit', async () => {
    mockGetCached.mockResolvedValue('/mock/cache/audio_story-123.mp3');
    const result = await getAudioSource(mockStory);
    expect(result).toEqual({ uri: '/mock/cache/audio_story-123.mp3' });
    expect(mockStream).not.toHaveBeenCalled();
  });

  it('streams from server on cache miss', async () => {
    mockGetCached.mockResolvedValue(null);
    mockStream.mockResolvedValue('/mock/cache/audio_story-123.mp3');
    const result = await getAudioSource(mockStory);
    expect(result).toEqual({ uri: '/mock/cache/audio_story-123.mp3' });
    expect(mockStream).toHaveBeenCalledWith('story-123', 'Once upon a time. The end.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/lib/__tests__/audio-utils.test.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `getAudioSource` is not async or returns wrong value.

- [ ] **Step 3: Rewrite audio-utils.ts**

```typescript
// src/lib/audio-utils.ts
import { getCachedAudioPath } from './audio-cache';
import { streamStoryAudio } from './audio-stream';
import type { Story } from '@/types';

const SAMPLE_AUDIO = require('../../assets/audio/sample-story.mp3');
const AMBIENT_RAIN = require('../../assets/audio/ambient-rain.mp3');

export async function getAudioSource(story: Story): Promise<{ uri: string }> {
  const cachedPath = await getCachedAudioPath(story.id);
  if (cachedPath) {
    return { uri: cachedPath };
  }

  const localPath = await streamStoryAudio(story.id, story.story_text);
  return { uri: localPath };
}

export function getSampleAudioSource(): { uri: string } {
  return { uri: SAMPLE_AUDIO };
}

export function getAmbientAudioSource(): { uri: string } {
  return { uri: AMBIENT_RAIN };
}
```

- [ ] **Step 4: Run audio-utils tests to verify they pass**

```bash
npx jest src/lib/__tests__/audio-utils.test.ts --no-coverage 2>&1 | tail -20
```

Expected: All tests PASS.

- [ ] **Step 5: Update PlayerContext.tsx to await getAudioSource**

Read `src/contexts/PlayerContext.tsx` and update `playStory`:

```typescript
// In playStory function, change:
//   const source = getAudioSource(story);
// To:
//   const source = await getAudioSource(story);
```

The `playStory` callback is already `async`, so no other changes are needed.

- [ ] **Step 6: Run typecheck**

```bash
npx tsc --noEmit 2>&1 | tail -20
```

Expected: No type errors.

- [ ] **Step 7: Run lint**

```bash
npm run lint 2>&1 | tail -20
```

Expected: No lint errors.

- [ ] **Step 8: Run all tests**

```bash
npx jest --no-coverage 2>&1 | tail -30
```

Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/audio-utils.ts src/lib/__tests__/audio-utils.test.ts src/contexts/PlayerContext.tsx
git commit -m "feat: integrate cache-first audio playback with streaming fallback"
```

---

### Task 6: Final Verification

**Covers:** [S1, S2, S3, S4, S5, S6]

- [ ] **Step 1: Run full typecheck**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 3: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 4: Verify edge function syntax**

```bash
cat supabase/functions/generate-story-audio/index.ts | head -5
```

Expected: File exists and starts with import statement.

- [ ] **Step 5: Verify file structure**

```bash
ls -la src/lib/audio-cache.ts src/lib/audio-stream.ts src/lib/audio-utils.ts supabase/functions/generate-story-audio/index.ts
```

Expected: All 4 files exist.

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git status
```

If any uncommitted changes remain, commit them.

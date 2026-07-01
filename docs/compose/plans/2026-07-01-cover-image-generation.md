# Cover Image Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate watercolor cover images for stories using Gemini 3.1 Flash and display them asynchronously on the story card.

**Architecture:** Client fires image generation async after story creation, polls for completion every 3 seconds. Edge function calls Gemini, uploads to Supabase Storage, updates story record. Images cached locally for offline replay.

**Tech Stack:** `@ai-sdk/google` (Gemini 3.1 Flash), Supabase Storage, Supabase Edge Functions (Deno), React hooks, expo-file-system

## Global Constraints

- Edge functions use Deno runtime with ESM imports
- Image style: muted watercolor children's book illustration, calming bedtime aesthetic
- Supabase Storage bucket `covers` with public read access
- Local cache follows same FIFO eviction as audio (5 stories max)
- Polling timeout: 60 seconds max, 3 second intervals
- No new npm dependencies required (`@ai-sdk/google` already installed)

---

### Task 1: Create Supabase Storage Bucket Migration

**Covers:** S5

**Files:**
- Create: `supabase/migrations/20260701000000_create_covers_bucket.sql`

**Interfaces:**
- Produces: Storage bucket `covers` with public read policy

- [ ] **Step 1: Write migration SQL**

```sql
-- Create public storage bucket for cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'covers');

-- Allow public read access
CREATE POLICY "Public read access for covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'covers');
```

- [ ] **Step 2: Apply migration locally**

Run: `supabase db reset`

Expected: Migration applied, `covers` bucket exists in storage.buckets

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260701000000_create_covers_bucket.sql
git commit -m "feat(storage): add covers bucket migration for cover images"
```

---

### Task 2: Build generate-cover-image Edge Function

**Covers:** S2, S3

**Files:**
- Create: `supabase/functions/generate-cover-image/index.ts`
- Create: `supabase/functions/generate-cover-image/index.test.ts`

**Interfaces:**
- Consumes: `storyId: string`, `title: string` from request body
- Produces: `{ coverImageUrl: string }` response
- Uses: `MIMO_API_KEY` env var (for Gemini), Supabase service role for storage/DB

- [ ] **Step 1: Write failing tests for prompt building**

```typescript
// supabase/functions/generate-cover-image/index.test.ts
import { buildCoverPrompt, mapChallengeToScene } from "./index.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

Deno.test("mapChallengeToScene returns scene for screentime", () => {
  const scene = mapChallengeToScene("screentime");
  assertEquals(scene, "a child putting away a device in a cozy room");
});

Deno.test("mapChallengeToScene returns scene for bedtime", () => {
  const scene = mapChallengeToScene("bedtime");
  assertEquals(scene, "a peaceful bedroom with stars and moon visible through a window");
});

Deno.test("mapChallengeToScene returns default for unknown", () => {
  const scene = mapChallengeToScene("unknown");
  assertEquals(scene, "a cozy bedtime scene");
});

Deno.test("buildCoverPrompt includes title and style", () => {
  const prompt = buildCoverPrompt("Barnaby's Big Night", "bear", "bedtime");
  // prompt is an array of content parts
  const text = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
  assertEquals(text.includes("Barnaby's Big Night"), true);
  assertEquals(text.includes("watercolor"), true);
  assertEquals(text.includes("bear"), true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `deno test supabase/functions/generate-cover-image/index.test.ts`

Expected: FAIL with module not found / function not defined

- [ ] **Step 3: Implement prompt building functions**

```typescript
// supabase/functions/generate-cover-image/index.ts
export function mapChallengeToScene(challenge: string): string {
  const scenes: Record<string, string> = {
    screentime: "a child putting away a device in a cozy room",
    emotions: "a child breathing calmly with warm soothing colors around",
    bedtime: "a peaceful bedroom with stars and moon visible through a window",
    social: "friendly characters sharing and playing together gently",
  };
  return scenes[challenge] ?? "a cozy bedtime scene";
}

export function buildCoverPrompt(
  title: string,
  protagonistSpecies: string,
  challenge: string
): string {
  const scene = mapChallengeToScene(challenge);
  return [
    "A soft, muted watercolor illustration for a children's bedtime storybook.",
    `Scene: ${scene} featuring a friendly ${protagonistSpecies.toLowerCase()} character.`,
    `Story title hint: "${title}".`,
    "Style: gentle pastel colors, dreamy atmosphere, rounded soft shapes, no text, no words, no letters, no numbers.",
    "Calming and sleep-appropriate. Aspect ratio: 4:3 landscape.",
    "Children's book illustration, safe, calming, warm.",
  ].join(" ");
}
```

- [ ] **Step 4: Run prompt tests to verify they pass**

Run: `deno test supabase/functions/generate-cover-image/index.test.ts`

Expected: PASS

- [ ] **Step 5: Write failing tests for edge function handler**

```typescript
// Add to supabase/functions/generate-cover-image/index.test.ts

Deno.test("handleRequest returns 405 for non-POST", async () => {
  const req = new Request("http://localhost", { method: "GET" });
  const { handleRequest } = await import("./index.ts");
  const res = await handleRequest(req);
  assertEquals(res.status, 405);
});

Deno.test("handleRequest returns 401 without auth header", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ storyId: "123", title: "Test" }),
  });
  const { handleRequest } = await import("./index.ts");
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
});

Deno.test("handleRequest returns 400 without storyId", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: JSON.stringify({ title: "Test" }),
  });
  const { handleRequest } = await import("./index.ts");
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
});
```

- [ ] **Step 6: Run handler tests to verify they fail**

Run: `deno test supabase/functions/generate-cover-image/index.test.ts`

Expected: FAIL with handleRequest not found

- [ ] **Step 7: Implement full edge function handler**

```typescript
// supabase/functions/generate-cover-image/index.ts

import { generateText } from "https://esm.sh/ai@6";
import { google } from "https://esm.sh/@ai-sdk/google@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  storyId: string;
  title: string;
  challenge?: string;
  protagonist?: string;
}

// ... mapChallengeToScene and buildCoverPrompt from above ...

export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_AI_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!body.storyId || !body.title) {
    return new Response(
      JSON.stringify({ error: "storyId and title are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get Supabase admin client
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Authenticate user
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify story exists and belongs to user
  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, protagonist, challenge")
    .eq("id", body.storyId)
    .eq("user_id", user.id)
    .single();

  if (storyError || !story) {
    return new Response(
      JSON.stringify({ error: "Story not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Build prompt
  const prompt = buildCoverPrompt(
    body.title,
    body.protagonist ?? story.protagonist ?? "bear",
    body.challenge ?? story.challenge ?? "bedtime"
  );

  // Generate image with Gemini
  const model = google("gemini-3.1-flash-image-generation", {
    apiKey,
  });

  let imageBytes: Uint8Array;
  try {
    const result = await generateText({
      model,
      prompt,
      providerOptions: {
        google: { responseModalities: ["image"] },
      },
    });

    // Extract image from response
    const imagePart = result.files?.find((f) => f.mimeType.startsWith("image/"));
    if (!imagePart) {
      throw new Error("No image in response");
    }
    imageBytes = imagePart.uint8Array;
  } catch (err) {
    console.error("Image generation failed:", err);
    return new Response(
      JSON.stringify({ error: "Image generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Upload to Supabase Storage
  const filePath = `covers/${body.storyId}.png`;
  const { error: uploadError } = await supabase.storage
    .from("covers")
    .upload(filePath, imageBytes, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    console.error("Storage upload failed:", uploadError);
    return new Response(
      JSON.stringify({ error: "Failed to upload image" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("covers")
    .getPublicUrl(filePath);

  const coverImageUrl = urlData.publicUrl;

  // Update story record
  const { error: updateError } = await supabase
    .from("stories")
    .update({ cover_image_url: coverImageUrl })
    .eq("id", body.storyId);

  if (updateError) {
    console.error("Story update failed:", updateError);
    return new Response(
      JSON.stringify({ error: "Failed to update story" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ coverImageUrl }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

if (import.meta.main) {
  Deno.serve(handleRequest);
}
```

- [ ] **Step 8: Run all handler tests to verify they pass**

Run: `deno test supabase/functions/generate-cover-image/index.test.ts`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add supabase/functions/generate-cover-image/
git commit -m "feat(edge): add generate-cover-image function with Gemini"
```

---

### Task 3: Add Client API Function for Cover Image Generation

**Covers:** S4

**Files:**
- Modify: `src/api/stories.ts`

**Interfaces:**
- Produces: `generateCoverImage(storyId: string, title: string): Promise<{ coverImageUrl: string }>`
- Consumes: Supabase client, edge function `generate-cover-image`

- [ ] **Step 1: Write failing test for API function**

```typescript
// src/api/__tests__/stories.test.ts (or add to existing)
import { generateCoverImage } from '../stories';

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    functions: { invoke: jest.fn() },
  },
}));

describe('generateCoverImage', () => {
  it('calls generate-cover-image edge function with correct params', async () => {
    const { supabase } = require('@/lib/supabase');
    supabase.functions.invoke.mockResolvedValue({
      data: { coverImageUrl: 'https://example.com/cover.png' },
      error: null,
    });

    const result = await generateCoverImage('story-123', 'Test Story');

    expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-cover-image', {
      body: { storyId: 'story-123', title: 'Test Story' },
    });
    expect(result).toEqual({ coverImageUrl: 'https://example.com/cover.png' });
  });

  it('throws on error', async () => {
    const { supabase } = require('@/lib/supabase');
    supabase.functions.invoke.mockResolvedValue({
      data: null,
      error: new Error('Failed'),
    });

    await expect(generateCoverImage('story-123', 'Test')).rejects.toThrow('Failed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:ci -- --testPathPattern=stories.test`

Expected: FAIL with generateCoverImage not found

- [ ] **Step 3: Implement API function**

```typescript
// Add to src/api/stories.ts

export async function generateCoverImage(
  storyId: string,
  title: string
): Promise<{ coverImageUrl: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('generate-cover-image', {
    body: { storyId, title },
  });

  if (error) throw error;
  return data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:ci -- --testPathPattern=stories.test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/stories.ts src/api/__tests__/stories.test.ts
git commit -m "feat(api): add generateCoverImage function"
```

---

### Task 4: Create useCoverImage Hook with Polling

**Covers:** S4

**Files:**
- Create: `src/hooks/use-cover-image.ts`
- Create: `src/hooks/__tests__/use-cover-image.test.ts`

**Interfaces:**
- Consumes: `generateCoverImage()` from `@/api/stories`, `getStory()` (new API function)
- Produces: `useCoverImage(storyId, title, options?) → { coverUrl: string | null, isLoading: boolean, error: Error | null }`

- [ ] **Step 1: Add getStory API function**

```typescript
// Add to src/api/stories.ts

export async function getStory(storyId: string): Promise<Story> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Write failing tests for hook**

```typescript
// src/hooks/__tests__/use-cover-image.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useCoverImage } from '../use-cover-image';

jest.mock('@/api/stories', () => ({
  generateCoverImage: jest.fn(),
  getStory: jest.fn(),
}));

describe('useCoverImage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('fires generation on mount and returns loading state', () => {
    const { generateCoverImage } = require('@/api/stories');
    generateCoverImage.mockResolvedValue({ coverImageUrl: null });

    const { result } = renderHook(() =>
      useCoverImage('story-1', 'Test Title')
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.coverUrl).toBeNull();
  });

  it('returns coverUrl when story has cover_image_url', async () => {
    const { generateCoverImage, getStory } = require('@/api/stories');
    generateCoverImage.mockResolvedValue({ coverImageUrl: 'https://example.com/cover.png' });
    getStory.mockResolvedValue({ id: 'story-1', cover_image_url: 'https://example.com/cover.png' });

    const { result } = renderHook(() =>
      useCoverImage('story-1', 'Test Title')
    );

    await waitFor(() => {
      expect(result.current.coverUrl).toBe('https://example.com/cover.png');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('polls every 3 seconds until cover is ready', async () => {
    const { generateCoverImage, getStory } = require('@/api/stories');
    generateCoverImage.mockResolvedValue({ coverImageUrl: null });

    // First two polls return null, third returns URL
    getStory
      .mockResolvedValueOnce({ id: 'story-1', cover_image_url: null })
      .mockResolvedValueOnce({ id: 'story-1', cover_image_url: null })
      .mockResolvedValueOnce({ id: 'story-1', cover_image_url: 'https://example.com/cover.png' });

    const { result } = renderHook(() =>
      useCoverImage('story-1', 'Test Title')
    );

    // Advance past initial generation + first poll
    jest.advanceTimersByTime(3000);
    await waitFor(() => expect(getStory).toHaveBeenCalledTimes(1));

    // Second poll
    jest.advanceTimersByTime(3000);
    await waitFor(() => expect(getStory).toHaveBeenCalledTimes(2));

    // Third poll - gets URL
    jest.advanceTimersByTime(3000);
    await waitFor(() => {
      expect(result.current.coverUrl).toBe('https://example.com/cover.png');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('times out after 60 seconds', async () => {
    const { generateCoverImage, getStory } = require('@/api/stories');
    generateCoverImage.mockResolvedValue({ coverImageUrl: null });
    getStory.mockResolvedValue({ id: 'story-1', cover_image_url: null });

    const { result } = renderHook(() =>
      useCoverImage('story-1', 'Test Title')
    );

    // Advance past timeout
    jest.advanceTimersByTime(63000);
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.coverUrl).toBeNull();
    });
  });

  it('cleans up polling on unmount', () => {
    const { generateCoverImage } = require('@/api/stories');
    generateCoverImage.mockResolvedValue({ coverImageUrl: null });

    const { unmount } = renderHook(() =>
      useCoverImage('story-1', 'Test Title')
    );

    unmount();
    // No assertions needed - just verify no memory leaks
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test:ci -- --testPathPattern=use-cover-image`

Expected: FAIL with useCoverImage not found

- [ ] **Step 4: Implement useCoverImage hook**

```typescript
// src/hooks/use-cover-image.ts
import { useEffect, useRef, useState } from 'react';
import { generateCoverImage, getStory } from '@/api/stories';

const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 60000;

interface UseCoverImageResult {
  coverUrl: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useCoverImage(
  storyId: string,
  title: string,
  options?: { enabled?: boolean }
): UseCoverImageResult {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabled = options?.enabled !== false;

  useEffect(() => {
    if (!enabled || !storyId || !title) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const cleanup = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRefRef.current);
        timeoutRef.current = null;
      }
    };

    const startPolling = () => {
      pollTimerRef.current = setInterval(async () => {
        if (cancelled) return;
        try {
          const story = await getStory(storyId);
          if (story.cover_image_url && !cancelled) {
            setCoverUrl(story.cover_image_url);
            setIsLoading(false);
            cleanup();
          }
        } catch {
          // Poll failures are non-fatal, keep trying
        }
      }, POLL_INTERVAL_MS);
    };

    const init = async () => {
      try {
        // Fire generation (don't await full completion)
        generateCoverImage(storyId, title).catch(() => {
          // Generation failure is non-fatal, placeholder stays
        });

        // Start polling immediately
        startPolling();

        // Set timeout
        timeoutRef.current = setTimeout(() => {
          if (!cancelled) {
            setIsLoading(false);
            cleanup();
          }
        }, TIMEOUT_MS);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [storyId, title, enabled]);

  return { coverUrl, isLoading, error };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:ci -- --testPathPattern=use-cover-image`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-cover-image.ts src/hooks/__tests__/use-cover-image.test.ts src/api/stories.ts
git commit -m "feat(hooks): add useCoverImage hook with polling"
```

---

### Task 5: Update Story Screen to Use Cover Image Hook

**Covers:** S4, S5

**Files:**
- Modify: `src/app/story.tsx`

**Interfaces:**
- Consumes: `useCoverImage` hook, `getCachedCoverPath`/`cacheCoverImage` from audio-cache
- Produces: Dynamic cover image display with local caching

- [ ] **Step 1: Add cover cache helpers to audio-cache.ts**

```typescript
// Add to src/lib/audio-cache.ts

export async function getCachedCoverPath(storyId: string): Promise<string | null> {
  const path = coverPath(storyId);
  const info = await getInfoAsync(path);
  return info.exists ? path : null;
}

export async function cacheCoverImage(storyId: string, imageUrl: string): Promise<string> {
  const path = coverPath(storyId);
  // Download and cache
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve) => {
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
  // Extract base64 data after prefix
  const base64Data = base64.split(',')[1];
  await writeAsStringAsync(path, base64Data, { encoding: EncodingType.Base64 });
  return path;
}
```

- [ ] **Step 2: Update story.tsx to use hook and local cache**

```typescript
// src/app/story.tsx - replace existing content
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { GlassView } from 'expo-glass-effect';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { PROTAGONISTS } from '@/types';
import { preFetchAudio } from '@/lib/audio-utils';
import { useCoverImage } from '@/hooks/use-cover-image';
import { getCachedCoverPath, cacheCoverImage } from '@/lib/audio-cache';
import type { Story } from '@/types';

export default function StoryScreen() {
  const { story: storyJson } = useLocalSearchParams<{ story: string }>();
  const [localCoverPath, setLocalCoverPath] = useState<string | null>(null);

  let story: Story;
  try {
    story = JSON.parse(storyJson!);
  } catch {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>No story data</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText style={styles.backText}>Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const { coverUrl, isLoading: coverLoading } = useCoverImage(
    story.id,
    story.title
  );

  // Check local cache on mount
  useEffect(() => {
    getCachedCoverPath(story.id).then((path) => {
      if (path) setLocalCoverPath(path);
    });
  }, [story.id]);

  // Cache remote image when URL arrives
  useEffect(() => {
    if (coverUrl && !localCoverPath) {
      cacheCoverImage(story.id, coverUrl)
        .then((path) => setLocalCoverPath(path))
        .catch(() => {
          // Cache failure is non-fatal
        });
    }
  }, [coverUrl, story.id, localCoverPath]);

  useEffect(() => {
    if (story?.id && story?.story_text) {
      preFetchAudio(story.id, story.story_text).catch(() => {});
    }
  }, [story?.id, story?.story_text]);

  const protagonist = PROTAGONISTS.find((p) => p.id === story.protagonist);
  const imageSource = localCoverPath
    ? { uri: localCoverPath }
    : coverUrl
    ? { uri: coverUrl }
    : null;

  const handlePlay = () => {
    router.push({ pathname: '/player', params: { story: storyJson } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.imageContainer}>
        {imageSource ? (
          <Image
            source={imageSource}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          <ThemedView style={styles.placeholder}>
            <ThemedText style={styles.placeholderEmoji}>
              {protagonist?.emoji ?? '📖'}
            </ThemedText>
            <ThemedText style={styles.placeholderText}>
              Cover art is being painted...
            </ThemedText>
          </ThemedView>
        )}
        <ThemedView style={styles.gradientOverlay} />
      </ThemedView>

      <ThemedView style={styles.content}>
        <ThemedText style={styles.protagonist}>
          {protagonist?.emoji ?? '📖'} {protagonist?.name ?? 'Friend'}
        </ThemedText>
        <ThemedText style={styles.title}>{story.title}</ThemedText>
        <ThemedText style={styles.moral}>{story.moral}</ThemedText>

        <Pressable
          onPress={handlePlay}
          style={({ pressed }) => [
            styles.playButton,
            pressed && { opacity: 0.85 },
          ]}
        >
          <GlassView glassEffectStyle="regular" style={styles.playButtonGlass}>
            <ThemedText style={styles.playButtonText}>Play Story</ThemedText>
          </GlassView>
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    borderBottomColor: Colors.dark.background,
    borderBottomWidth: 80,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.loadingBackground,
    gap: Spacing.three,
  },
  placeholderEmoji: {
    fontSize: 64,
  },
  placeholderText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  protagonist: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '700',
  },
  moral: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.two,
  },
  playButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  playButtonGlass: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: 16,
    alignItems: 'center',
  },
  playButtonText: {
    color: Colors.dark.text,
    fontWeight: '600',
    fontSize: 17,
  },
  errorText: {
    color: Colors.dark.textSecondary,
    fontSize: 18,
    textAlign: 'center',
  },
  backText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginTop: Spacing.two,
  },
});
```

- [ ] **Step 3: Run TypeScript check**

Run: `npm run typecheck`

Expected: PASS (no type errors)

- [ ] **Step 4: Run existing story tests**

Run: `npm run test:ci -- --testPathPattern=story.test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/story.tsx src/lib/audio-cache.ts
git commit -m "feat(story): integrate cover image hook with local caching"
```

---

### Task 6: Fire Cover Image Generation from Generate Screen

**Covers:** S1

**Files:**
- Modify: `src/app/generate.tsx`

**Interfaces:**
- Consumes: `generateCoverImage` from `@/api/stories`
- Produces: Async fire-and-forget call after story creation

- [ ] **Step 1: Update generate.tsx to fire cover generation**

```typescript
// src/app/generate.tsx - add import and fire call

import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { GlassView } from 'expo-glass-effect';

import { BreathingCircle } from '@/components/breathing-circle';
import { CalmingCopy } from '@/components/calming-copy';
import { ThemedText } from '@/components/themed-text';
import { generateStory, generateCoverImage } from '@/api/stories';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { Colors, Spacing } from '@/constants/theme';
import type { ChallengeCategory, ChallengeTrigger } from '@/types';

export default function GenerateScreen() {
  const { category, trigger } = useLocalSearchParams<{
    category: ChallengeCategory;
    trigger: ChallengeTrigger;
  }>();
  const { selectedProfile } = useSelectedChild();

  const mutation = useMutation({
    mutationFn: () =>
      generateStory(
        selectedProfile!.id,
        selectedProfile!.protagonist,
        selectedProfile!.name,
        selectedProfile!.developmental_stage,
        category!,
        trigger!
      ),
    onSuccess: (story) => {
      // Fire cover image generation async (don't await)
      generateCoverImage(story.id, story.title).catch(() => {
        // Failure is non-fatal, placeholder will show
      });

      router.replace({
        pathname: '/story',
        params: { story: JSON.stringify(story) },
      });
    },
  });

  // ... rest of component unchanged
```

- [ ] **Step 2: Run TypeScript check**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 3: Run generate screen tests**

Run: `npm run test:ci -- --testPathPattern=generate`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/generate.tsx
git commit -m "feat(generate): fire cover image generation on story creation"
```

---

### Task 7: Add GOOGLE_AI_API_KEY to Environment

**Covers:** S2

**Files:**
- Modify: `.env.example`
- Modify: `docs/` (if setup docs exist)

**Interfaces:**
- Produces: `GOOGLE_AI_API_KEY` env var for edge function

- [ ] **Step 1: Update .env.example**

```bash
# Add to .env.example
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GOOGLE_AI_API_KEY=your-google-ai-api-key
```

- [ ] **Step 2: Verify edge function reads env var correctly**

Review: `supabase/functions/generate-cover-image/index.ts` uses `Deno.env.get("GOOGLE_AI_API_KEY")`

Expected: Code correctly reads from env

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "docs(env): add GOOGLE_AI_API_KEY to env example"
```

---

### Task 8: Final Integration Verification

**Covers:** S1, S2, S4, S5

**Files:**
- None (verification only)

**Interfaces:**
- N/A

- [ ] **Step 1: Run full test suite**

Run: `npm run test:ci`

Expected: All tests PASS

- [ ] **Step 2: Run TypeScript check**

Run: `npm run typecheck`

Expected: No type errors

- [ ] **Step 3: Verify edge function structure**

Run: `ls -la supabase/functions/generate-cover-image/`

Expected: `index.ts` and `index.test.ts` exist

- [ ] **Step 4: Verify all commits are clean**

Run: `git status`

Expected: Working tree clean, all changes committed

- [ ] **Step 5: Create summary commit if needed**

If any uncommitted changes remain:
```bash
git add -A
git commit -m "feat(cover-image): complete US-2.3 implementation"
```

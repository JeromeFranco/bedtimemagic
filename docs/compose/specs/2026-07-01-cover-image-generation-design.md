# Cover Image Generation Design Spec

**Date:** 2026-07-01
**User Story:** US-2.3
**Approach:** Fire-and-Poll

---

## [S1] Architecture Overview

**New edge function:** `generate-cover-image` — takes `storyId` and `title`, calls Gemini 3.1 Flash, uploads result to Supabase Storage, updates story record with public URL.

**Client flow:**
1. After `generateStory()` returns, client fires `generateCoverImage(storyId, title)` async (no await)
2. Story screen shows placeholder ("Cover art is being painted...")
3. Client polls `getStory(storyId)` every 3 seconds until `cover_image_url` is non-null
4. Image URL loads into `<Image>` component
5. Image downloaded and cached locally for offline replay

**Storage:** New Supabase Storage bucket `covers` with public read access. Images stored as `covers/{storyId}.png`.

---

## [S2] Edge Function: `generate-cover-image`

**Input:** `{ storyId: string, title: string }`

**Flow:**
1. Authenticate user via JWT (same pattern as `generate-story`)
2. Verify story record exists and belongs to user
3. Build Gemini prompt (see S3)
4. Call Gemini 3.1 Flash via `@ai-sdk/google`
5. Upload image bytes to Supabase Storage bucket `covers` as `{storyId}.png`
6. Get public URL and update story record's `cover_image_url`
7. Return `{ coverImageUrl: string }`

**Error handling:**
- Gemini timeout/safety filter → return error, story keeps `null` cover (placeholder stays)
- Storage upload failure → return error, retry on client
- Story not found → 404

**Dependencies:** `@ai-sdk/google` for Gemini, `@supabase/supabase-js` for storage/DB.

---

## [S3] Gemini Prompt Design

**Style:** Muted watercolor children's book illustration, calming bedtime aesthetic.

**Prompt template:**
```
A soft, muted watercolor illustration for a children's bedtime storybook. 
Scene: {derived from story title and challenge}.
Style: gentle pastel colors, dreamy atmosphere, rounded soft shapes, 
no text, no words, no letters. Calming and sleep-appropriate.
Aspect ratio: 4:3 landscape.
```

**Challenge-to-scene mapping:**
- `screentime` → child putting away device, cozy room
- `emotions` → child breathing calmly, warm colors
- `bedtime` → peaceful bedroom, stars, moon
- `social` → friendly characters sharing, playing together

**Protagonist integration:** Include protagonist species in scene (e.g., "a friendly bear character").

**Safety:** Gemini's built-in safety filters handle inappropriate content. Prompt explicitly says "children's book, safe, calming".

---

## [S4] Client-Side Components

**New API function:** `generateCoverImage(storyId, title)` — calls edge function, returns promise.

**New hook:** `useCoverImage(storyId, title)` — manages polling lifecycle.
- Returns `{ coverUrl: string | null, isLoading: boolean }`
- Fires generation on mount, polls every 3s until URL is non-null or timeout (60s)
- Cleans up polling on unmount

**Story screen updates:**
- Use `useCoverImage` hook
- When `coverUrl` updates, `<Image>` source changes from placeholder to actual URL
- Local cache: download image to `coverPath(storyId)` on first load, check cache on subsequent views

**Generate screen updates:**
- After `generateStory()` returns, fire `generateCoverImage()` async (don't await)
- Pass story data to story screen as before

---

## [S5] Storage & Caching

**Supabase Storage:**
- New public bucket: `covers`
- Path: `covers/{storyId}.png`
- Public URL for direct `<Image>` source
- No auth required for reads (public bucket)

**Local caching (client):**
- On image load, download to `cacheDirectory` as `cover_{storyId}.png`
- On subsequent views, check local cache first via `getInfoAsync`
- Cache hit → use local file URI (faster, works offline)
- Cache miss → use Supabase Storage URL, then cache on load
- FIFO eviction already handled by `enforceFifoEviction()` in `audio-cache.ts`

**Migration:**
- Add SQL migration to create storage bucket policy
- No schema changes needed (column exists)

---

## Implementation Order

1. Create Supabase Storage bucket `covers` with public policy
2. Build `generate-cover-image` edge function
3. Add `generateCoverImage()` API function
4. Create `useCoverImage()` hook with polling
5. Update `story.tsx` to use hook and local caching
6. Fire image generation from `generate.tsx` after story creation
7. Add tests

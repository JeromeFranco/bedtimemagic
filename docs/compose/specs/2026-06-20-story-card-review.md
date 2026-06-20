# US-1.4: Story Card Review

## [S1] Problem

After the LLM loading screen completes, `generate.tsx` navigates to `story.tsx` which is currently a placeholder showing only text. We need a full-bleed story card screen that gives the parent a preview of what was generated — title, cover art, moral — with a prominent "Play Story" button to begin playback.

**User Story:** As a parent, I want to see a preview of the generated story before playing, so that I can verify it's appropriate for tonight.

## [S2] Acceptance Criteria

- [ ] Displays: Story Title, Watercolor Cover Art (async-generated), Moral summary
- [ ] "Play Story" button prominently displayed
- [ ] If cover art isn't ready yet, show a calm placeholder (not a broken image)
- [ ] Dark mode card aesthetic maintained
- [ ] Tapping "Play Story" calls `PlayerContext.playStory(story)` and navigates forward

## [S3] Data Flow

### Navigation

**Modified route:** `src/app/story.tsx` — presented as a replacement screen after loading.

**Navigation flow:**
```
Home (tab) → [push] Generate (modal) → [replace] Story Card
```

**Data transfer:** `generate.tsx` serializes the `Story` object into a route param:
```ts
router.replace({
  pathname: '/story',
  params: { story: JSON.stringify(story) },
});
```

`story.tsx` deserializes via `useLocalSearchParams<{ story: string }>()` and parses back to `Story`.

### Data Flow Sequence

1. `generate.tsx`'s mutation succeeds, receives `Story` object
2. Serializes story to JSON route param
3. `router.replace('/story', { story: serialized })`
4. `story.tsx` deserializes, stores in local state
5. Renders cover art (or placeholder), title, moral
6. On "Play Story" tap → `playStory(story)` via PlayerContext → navigate to player

## [S4] Screen Layout (Full-Bleed)

```
┌──────────────────────────────┐
│                              │
│      Cover Art Image         │  ← fills top ~60-65% of screen
│      (or placeholder)        │
│                              │
│                              │
├──────────────────────────────┤  ← dark gradient overlay
│                              │
│  🐻 Barnaby Bear             │  ← protagonist emoji + name
│  "The Toothbrush Adventure"  │  ← story title, larger font
│                              │
│  Moral: Sharing makes...     │  ← moral summary, 1-2 lines
│                              │
│      [ ▶ Play Story ]       │  ← glass-morphism button
│                              │
└──────────────────────────────┘
```

- Cover art: `Image` component with `resizeMode: 'cover'`, absolute positioned to fill top portion
- Bottom section: dark gradient overlay (`linear-gradient` from transparent to background color) over the bottom edge of the cover art, then content below
- All text: `ThemedText` with dark theme colors
- Layout uses `SafeAreaView` for bottom padding

## [S5] Cover Art Placeholder

When `cover_image_url` is `null` (async Gemini generation not yet complete):

- Full-screen deep navy background (`#0A0E27`)
- Large protagonist emoji centered vertically (~64px font size)
- Subtle secondary text below: "Cover art is being painted..."
- No broken image icon, no spinner, no bright elements
- When `cover_image_url` arrives, cross-fade or swap to the real image

## [S6] Play Button

- Glass-morphism pill button using `GlassView` from `expo-glass-effect` (consistent with existing pattern in `generate.tsx` error buttons)
- Text: "Play Story"
- On tap: calls `PlayerContext.playStory(story)` to set the active story
- Navigates to player screen (placeholder for US-1.5 — for now just stays on story card or shows a minimal placeholder)
- Prominent sizing: full-width with generous padding, centered text

## [S7] Files to Modify

| File | Change |
|------|--------|
| `src/app/story.tsx` | Replace placeholder with full-bleed story card screen |
| `src/app/generate.tsx` | Pass serialized `Story` object in route params on success |

## [S8] Dependencies

All dependencies already installed:
- `expo-glass-effect` — GlassView for play button
- `expo-router` — navigation and route params
- `react-native` — Image, StyleSheet, etc.
- `react-native-safe-area-context` — SafeAreaView
- No new packages required

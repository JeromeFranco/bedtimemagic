# US-1.3: Story Generation Loading Experience

## [S1] Problem

After tapping "Generate" on the home screen, the app currently does nothing (just logs to console). We need a calming, low-stimulus transition screen that plays while the LLM generates the story, replacing a blank/stalled experience.

**User Story:** As a parent, I want a calming transition while the story generates, so that I'm not staring at a spinner while the LLM thinks.

## [S2] Acceptance Criteria

- [ ] After tapping "Generate", screen transitions to deep navy low-stimulus screen
- [ ] Slow pulsating ambient circle displayed (calm breathing pacer)
- [ ] Copy: "Breathe in slowly..." — rotates to other calming messages
- [ ] No bright elements, no progress percentage, no spinning icons
- [ ] Transition completes when story payload returns from API

## [S3] Architecture

### Navigation

**New route:** `src/app/generate.tsx` — presented as a stack/modal screen over the tab layout.

**Navigation flow:**
```
Home (tab) → [push] Generate (modal) → [replace] Story Card (placeholder)
```

Route params passed from home: `category` (ChallengeCategory), `trigger` (ChallengeTrigger).

### Data Flow

1. Home screen's `handleGenerate` calls `router.push('/generate', { category, trigger })`
2. `generate.tsx` resolves the selected child profile from `SelectedChildContext`
3. Resolves protagonist from seed data (default or profile-assigned)
4. React Query `useMutation` calls `generateStory()` with resolved inputs
5. On success → `router.replace('/story')` (placeholder — story card is US-1.4)
6. On error → error state with retry/back

### New Files

| File | Purpose |
|------|---------|
| `src/app/generate.tsx` | Loading screen route (modal) |
| `src/components/breathing-circle.tsx` | Pulsating ambient circle animation |
| `src/components/calming-copy.tsx` | Rotating calming messages |

### Modified Files

| File | Change |
|------|--------|
| `src/app/index.tsx` | Wire `handleGenerate` to `router.push('/generate', ...)` |
| `src/constants/theme.ts` | Add `loadingBackground: '#0A0E27'` to dark theme |

## [S4] Breathing Circle Component

A centered, pulsating circle that serves as a calm breathing pacer.

**Animation:**
- Reanimated `useAnimatedStyle` with `withRepeat(withTiming(...))`
- Scale loop: 1.0 → 1.15 → 1.0 over ~4 seconds (ease-in-out)
- Opacity glow: 0.3 → 0.6 → 0.3 synced with scale
- Uses `RepeatMode.Reverse` for smooth ping-pong

**Visual:**
- Circle diameter: ~120px
- Background color: muted violet (`#8B5CF6` at 20% opacity)
- Soft edge: slight blur or feathered border (or box-shadow equivalent)
- No hard edges — should feel like a soft glow

**Implementation:**
- Uses `react-native-reanimated` (already installed)
- No additional dependencies needed
- Single `Animated.View` with `useAnimatedStyle`

## [S5] Calming Copy Component

Rotating calming messages displayed below the breathing circle.

**Messages (4-5):**
- "Breathe in slowly..."
- "Let the day drift away..."
- "Tonight's story is almost ready..."
- "Feel the calm settle in..."

**Behavior:**
- Rotates every ~5 seconds
- Transition: `FadeIn` / `FadeOut` (Reanimated) — 800ms duration
- Text: `ThemedText` subtitle style, secondary text color (`textSecondary`)
- Centered horizontally, positioned below the breathing circle

**Implementation:**
- `useState` for current message index
- `useEffect` with `setInterval` for rotation
- Animated.View wrapper for fade transitions

## [S6] Error State

Shown when `generateStory()` fails (API error, timeout, safety filter).

**Visual:**
- Same deep navy background (`#0A0E27`)
- Calming error message: "Hmm, something went wrong. Let's try again."
- Two buttons below the message

**Buttons:**
- "Try Again" — re-runs the mutation, styled as a glass-morphism pill
- "Go Back" — `router.back()`, styled as subtle text button
- Both use `GlassView` from `expo-glass-effect` (consistent with existing pattern)

## [S7] Screen Layout

```
┌──────────────────────────┐
│     (safe area)          │
│                          │
│                          │
│      ○ ○ ○ ○ ○          │  ← Breathing circle (centered)
│                          │
│   "Breathe in slowly..." │  ← Calming copy (below circle)
│                          │
│                          │
│                          │
└──────────────────────────┘
```

- Deep navy background: `#0A0E27`
- No header bar, no status bar customization
- Safe area padding applied
- Full-screen, covers entire display

## [S8] Dependencies

All dependencies already installed:
- `react-native-reanimated` — animations
- `expo-glass-effect` — GlassView for error buttons
- `expo-router` — navigation
- No new packages required

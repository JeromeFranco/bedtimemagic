# US-1.4: Story Card Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder story screen with a full-bleed cover art card showing title, moral, and a "Play Story" button.

**Architecture:** Two-file change. `generate.tsx` serializes the Story object into route params on success. `story.tsx` deserializes and renders a full-bleed layout with cover image (or placeholder), title, moral, and a glass-morphism play button that triggers PlayerContext.

**Tech Stack:** React Native, Expo Router, expo-glass-effect (GlassView), react-native-safe-area-context, @testing-library/react-native (tests)

---

### Task 1: Install test dependencies

**Covers:** (infrastructure)

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @testing-library/react-native**

Run: `npx expo install @testing-library/react-native`
Expected: Package added to dependencies

- [ ] **Step 2: Verify jest runs**

Run: `npx jest --passWithNoTests`
Expected: No test failures

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @testing-library/react-native for component tests"
```

---

### Task 2: Wire story data through route params

**Covers:** [S3]

**Files:**
- Modify: `src/app/generate.tsx:30-32`

- [ ] **Step 1: Update generate.tsx onSuccess to pass story data**

Replace the current `onSuccess` callback:

```tsx
onSuccess: (story) => {
  router.replace({
    pathname: '/story',
    params: { story: JSON.stringify(story) },
  });
},
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/generate.tsx
git commit -m "feat: pass story data via route params from generate to story card"
```

---

### Task 3: Write failing tests for StoryCard

**Covers:** [S2, S4, S5, S6]

**Files:**
- Create: `src/app/__tests__/story.test.tsx`

- [ ] **Step 1: Create test file with mocks and test cases**

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockPlayStory = jest.fn();
jest.mock('@/contexts/PlayerContext', () => ({
  usePlayer: () => ({ playStory: mockPlayStory }),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  router: { back: jest.fn() },
}));

jest.mock('expo-glass-effect', () => ({
  GlassView: ({ children, ...props }: any) => React.createElement('GlassView', props, children),
}));

import StoryScreen from '../story';
import { useLocalSearchParams } from 'expo-router';

const MOCK_STORY = {
  id: 'story-1',
  user_id: 'user-1',
  child_id: 'child-1',
  title: 'The Toothbrush Adventure',
  story_text: 'Once upon a time...',
  moral: 'Brushing teeth keeps your smile bright.',
  pillow_talk_prompt: 'What was your favorite part?',
  sleepy_affirmation: 'I am brave and kind.',
  cover_image_url: 'https://example.com/cover.png',
  challenge: 'refusing_teeth' as const,
  protagonist: 'barnaby' as const,
  created_at: '2026-06-20T00:00:00Z',
};

describe('StoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      story: JSON.stringify(MOCK_STORY),
    });
  });

  it('renders story title', () => {
    const { getByText } = render(<StoryScreen />);
    expect(getByText('The Toothbrush Adventure')).toBeTruthy();
  });

  it('renders moral summary', () => {
    const { getByText } = render(<StoryScreen />);
    expect(getByText('Brushing teeth keeps your smile bright.')).toBeTruthy();
  });

  it('renders protagonist name and emoji', () => {
    const { getByText } = render(<StoryScreen />);
    expect(getByText(/Barnaby/)).toBeTruthy();
  });

  it('renders Play Story button', () => {
    const { getByText } = render(<StoryScreen />);
    expect(getByText('Play Story')).toBeTruthy();
  });

  it('calls playStory when Play is tapped', () => {
    const { getByText } = render(<StoryScreen />);
    fireEvent.press(getByText('Play Story'));
    expect(mockPlayStory).toHaveBeenCalledWith(MOCK_STORY);
  });

  it('shows placeholder when cover_image_url is null', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      story: JSON.stringify({ ...MOCK_STORY, cover_image_url: null }),
    });
    const { getByText } = render(<StoryScreen />);
    expect(getByText('Cover art is being painted...')).toBeTruthy();
  });

  it('shows error state when no story param', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    const { getByText } = render(<StoryScreen />);
    expect(getByText('No story data')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/app/__tests__/story.test.tsx`
Expected: FAIL — `Cannot find module '../story'` or similar (component doesn't exist yet)

- [ ] **Step 3: Commit (failing tests)**

```bash
git add src/app/__tests__/story.test.tsx
git commit -m "test: add failing tests for US-1.4 story card"
```

---

### Task 4: Implement story card to pass tests

**Covers:** [S2, S4, S5, S6]

**Files:**
- Modify: `src/app/story.tsx`

- [ ] **Step 1: Replace placeholder with full-bleed story card**

```tsx
import { useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { GlassView } from 'expo-glass-effect';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePlayer } from '@/contexts/PlayerContext';
import { Colors, Spacing } from '@/constants/theme';
import { PROTAGONISTS } from '@/types';
import type { Story } from '@/types';

export default function StoryScreen() {
  const { story: storyJson } = useLocalSearchParams<{ story: string }>();
  const { playStory } = usePlayer();
  const [imageError, setImageError] = useState(false);

  if (!storyJson) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>No story data</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText style={styles.backText}>Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const story: Story = JSON.parse(storyJson);
  const protagonist = PROTAGONISTS.find((p) => p.id === story.protagonist);
  const showPlaceholder = !story.cover_image_url || imageError;

  const handlePlay = () => {
    playStory(story);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.imageContainer}>
        {showPlaceholder ? (
          <ThemedView style={styles.placeholder}>
            <ThemedText style={styles.placeholderEmoji}>
              {protagonist?.emoji ?? '📖'}
            </ThemedText>
            <ThemedText style={styles.placeholderText}>
              Cover art is being painted...
            </ThemedText>
          </ThemedView>
        ) : (
          <Image
            source={{ uri: story.cover_image_url! }}
            style={styles.coverImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        )}
        <ThemedView style={styles.gradientOverlay} />
      </ThemedView>

      <ThemedView style={styles.content}>
        <ThemedText style={styles.protagonist}>
          {protagonist?.emoji} {protagonist?.name}
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
    ...StyleSheet.absoluteFillObject,
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

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx jest src/app/__tests__/story.test.tsx`
Expected: All 7 tests PASS

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run linter**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/app/story.tsx
git commit -m "feat: implement US-1.4 full-bleed story card with cover art and play button"
```

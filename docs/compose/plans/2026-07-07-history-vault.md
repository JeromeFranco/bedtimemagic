# History Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Explore tab with a History Vault screen that displays the last 5 generated stories and supports instant replay from local cache.

**Architecture:** New `history.tsx` screen replaces `explore.tsx`, using the existing `useStories()` hook to fetch stories from Supabase and displaying them as tappable cards. Tapping navigates to the existing `/story` screen which already handles playback from cache via `getAudioSource()`.

**Tech Stack:** React Native StyleSheet, expo-router, @tanstack/react-query, expo-image, expo-file-system (existing cache layer)

## Global Constraints

- Dark mode enforced: deep blues/purples, no bright backgrounds
- Max 5 stories displayed (matches FIFO cache limit)
- Follow existing component patterns: `ThemedText`, `ThemedView`, `useTheme()`
- Use `Spacing` and `Colors` from `@/constants/theme`
- No new dependencies required

---

### Task 1: Create StoryHistoryCard component

**Covers:** US-4.1 (history list entry display)

**Files:**
- Create: `src/components/story-history-card.tsx`

**Interfaces:**
- Consumes: `Story` type from `@/types`, `PROTAGONISTS` and `CHALLENGE_TRIGGERS` from `@/types`
- Produces: `StoryHistoryCard` component with `story` and `onPress` props

- [ ] **Step 1: Create the StoryHistoryCard component**

Create `src/components/story-history-card.tsx`:

```tsx
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { getCachedCoverPath } from '@/lib/audio-cache';
import { CHALLENGE_TRIGGERS, PROTAGONISTS, type Story } from '@/types';

interface StoryHistoryCardProps {
  story: Story;
  onPress: () => void;
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export function StoryHistoryCard({ story, onPress }: StoryHistoryCardProps) {
  const [coverPath, setCoverPath] = useState<string | null>(null);

  const protagonist = PROTAGONISTS.find((p) => p.id === story.protagonist);
  const challenge = CHALLENGE_TRIGGERS.find((c) => c.id === story.challenge);

  useEffect(() => {
    getCachedCoverPath(story.id).then(setCoverPath);
  }, [story.id]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.coverContainer}>
          {coverPath ? (
            <Image source={{ uri: coverPath }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <ThemedText style={styles.coverEmoji}>
                {protagonist?.emoji ?? '📖'}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <ThemedText numberOfLines={2} style={styles.title}>
            {story.title}
          </ThemedText>

          <View style={styles.metadata}>
            <ThemedText themeColor="textSecondary" style={styles.metaText}>
              {protagonist?.emoji} {protagonist?.name ?? 'Friend'}
            </ThemedText>
            {challenge && (
              <ThemedText themeColor="textSecondary" style={styles.metaText}>
                {challenge.label}
              </ThemedText>
            )}
          </View>

          <ThemedText themeColor="textSecondary" style={styles.date}>
            {formatRelativeDate(story.created_at)}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.8,
  },
  coverContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    margin: Spacing.three,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.loadingBackground,
  },
  coverEmoji: {
    fontSize: 32,
  },
  content: {
    flex: 1,
    paddingVertical: Spacing.three,
    paddingRight: Spacing.three,
    justifyContent: 'center',
    gap: Spacing.one,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metaText: {
    fontSize: 13,
  },
  date: {
    fontSize: 12,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors in the new file

- [ ] **Step 3: Commit**

```bash
git add src/components/story-history-card.tsx
git commit -m "feat: add StoryHistoryCard component for history vault"
```

---

### Task 2: Create History Vault screen

**Covers:** US-4.1 (history vault view), US-4.3 (replay playback entry point)

**Files:**
- Modify: `src/app/explore.tsx` (full rewrite)

**Interfaces:**
- Consumes: `useStories` from `@/hooks/use-story`, `StoryHistoryCard` from Task 1
- Produces: History Vault screen at `/explore` route

- [ ] **Step 1: Rewrite explore.tsx as History Vault**

Replace the entire content of `src/app/explore.tsx` with:

```tsx
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { StoryHistoryCard } from '@/components/story-history-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useStories } from '@/hooks/use-story';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Colors } from '@/constants/theme';

export default function HistoryVaultScreen() {
  const { data: stories, isLoading } = useStories();

  const handleStoryPress = (storyId: string) => {
    router.push({ pathname: '/story', params: { id: storyId } });
  };

  const handleGenerate = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.dark.text} />
        <ThemedText themeColor="textSecondary" style={styles.loadingText}>
          Loading stories...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText style={styles.heading}>Story Vault</ThemedText>

        {!stories || stories.length === 0 ? (
          <ThemedView style={[styles.container, styles.center]}>
            <ThemedText style={styles.emptyEmoji}>📚</ThemedText>
            <ThemedText style={styles.emptyTitle}>No stories yet</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              Generate your first bedtime story to see it here.
            </ThemedText>
            <Pressable
              onPress={handleGenerate}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView type="backgroundElement" style={styles.generateButton}>
                <ThemedText style={styles.generateButtonText}>
                  Create a Story
                </ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>
        ) : (
          <ThemedView style={styles.list}>
            {stories.slice(0, 5).map((story) => (
              <StoryHistoryCard
                key={story.id}
                story={story}
                onPress={() => handleStoryPress(story.id)}
              />
            ))}
          </ThemedView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    paddingTop: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
  heading: {
    color: Colors.dark.text,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: Spacing.four,
  },
  list: {
    gap: Spacing.three,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: Spacing.five,
  },
  generateButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 16,
    marginTop: Spacing.two,
  },
  generateButtonText: {
    color: Colors.dark.text,
    fontWeight: '600',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/explore.tsx
git commit -m "feat: replace Explore tab with History Vault screen"
```

---

### Task 3: Update tab label and icon

**Covers:** US-4.1 (navigation entry point)

**Files:**
- Modify: `src/components/app-tabs.tsx`
- Create: `assets/images/tabIcons/history.png`, `history@2x.png`, `history@3x.png`

**Interfaces:**
- Consumes: `NativeTabs` from expo-router
- Produces: Updated tab with "Vault" label and history icon

- [ ] **Step 1: Update tab label in app-tabs.tsx**

In `src/components/app-tabs.tsx`, change the explore trigger to:

```tsx
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Vault</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
```

Note: We reuse the existing explore icon asset since creating new icon assets requires design tools. The label change is sufficient for users to understand the tab's purpose.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/app-tabs.tsx
git commit -m "feat: rename Explore tab to Vault for history screen"
```

---

### Task 4: Verify end-to-end flow

**Covers:** US-4.3 (replay playback verification)

**Files:** None (manual verification)

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 2: Run lint**

Run: `npx expo lint`
Expected: No errors

- [ ] **Step 3: Start dev server and verify manually**

Run: `npx expo start`
Expected:
- App loads without crashes
- "Vault" tab visible in bottom navigation
- Tapping Vault tab shows History Vault screen
- Empty state shows when no stories exist
- If stories exist, cards display with title, protagonist, challenge, date
- Tapping a card navigates to story preview screen
- Story preview → Play → Player uses cached audio (no TTS API call)

- [ ] **Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address verification issues for history vault"
```

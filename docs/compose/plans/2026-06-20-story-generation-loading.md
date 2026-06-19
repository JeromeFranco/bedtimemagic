# US-1.3: Story Generation Loading Experience — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a calming loading screen that transitions from the home screen while the story generates, featuring a breathing circle animation and rotating calming copy.

**Architecture:** New Expo Router modal route (`generate.tsx`) pushed from home. Contains two presentational components (`BreathingCircle`, `CalmingCopy`) and wires to `generateStory()` API via React Query mutation. On success, navigates to a placeholder story route. On error, shows retry/back UI.

**Tech Stack:** Expo Router (file-based routing), React Native Reanimated (animations), expo-glass-effect (GlassView), React Query (mutation), TypeScript.

---

### Task 1: Add loading background color to theme

**Covers:** [S4], [S7]

**Files:**
- Modify: `src/constants/theme.ts:16-22`

- [ ] **Step 1: Add `loadingBackground` to dark theme colors**

```typescript
dark: {
  text: '#ffffff',
  background: '#000000',
  backgroundElement: '#212225',
  backgroundSelected: '#2E3135',
  textSecondary: '#B0B4BA',
  loadingBackground: '#0A0E27',
},
```

Also add to light theme for type consistency:

```typescript
light: {
  text: '#000000',
  background: '#ffffff',
  backgroundElement: '#F0F0F3',
  backgroundSelected: '#E0E1E6',
  textSecondary: '#60646C',
  loadingBackground: '#0A0E27',
},
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/constants/theme.ts
git commit -m "feat(theme): add loadingBackground color for generation screen"
```

---

### Task 2: Create BreathingCircle component

**Covers:** [S4]

**Files:**
- Create: `src/components/breathing-circle.tsx`

- [ ] **Step 1: Create the BreathingCircle component**

```typescript
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  Cancelable,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const SIZE = 120;
const DURATION = 4000;

export function BreathingCircle() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    const scaleAnim: Cancelable = withRepeat(
      withTiming(1.15, { duration: DURATION / 2, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    scale.value = scaleAnim;

    const opacityAnim: Cancelable = withRepeat(
      withTiming(0.6, { duration: DURATION / 2, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    opacity.value = opacityAnim;

    return () => {
      scaleAnim.cancel?.();
      opacityAnim.cancel?.();
    };
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.circle, animatedStyle]} />
  );
}

const styles = StyleSheet.create({
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
});
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/breathing-circle.tsx
git commit -m "feat(components): add BreathingCircle with pulsating animation"
```

---

### Task 3: Create CalmingCopy component

**Covers:** [S5]

**Files:**
- Create: `src/components/calming-copy.tsx`

- [ ] **Step 1: Create the CalmingCopy component**

```typescript
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';

const MESSAGES = [
  'Breathe in slowly...',
  'Let the day drift away...',
  "Tonight's story is almost ready...",
  'Feel the calm settle in...',
];

const ROTATION_INTERVAL = 5000;

export function CalmingCopy() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % MESSAGES.length);
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return (
    <Animated.View
      key={index}
      entering={FadeIn.duration(800)}
      exiting={FadeOut.duration(800)}
      style={styles.container}
    >
      <ThemedText style={styles.text}>{MESSAGES[index]}</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  text: {
    color: 'rgba(176, 180, 186, 0.8)',
    fontSize: 16,
    textAlign: 'center',
  },
});
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/calming-copy.tsx
git commit -m "feat(components): add CalmingCopy with rotating messages"
```

---

### Task 4: Create generate.tsx loading screen route

**Covers:** [S3], [S6], [S7], [S8]

**Files:**
- Create: `src/app/generate.tsx`

- [ ] **Step 1: Create the generate screen route**

```typescript
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { GlassView } from 'expo-glass-effect';

import { BreathingCircle } from '@/components/breathing-circle';
import { CalmingCopy } from '@/components/calming-copy';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { generateStory } from '@/api/stories';
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
        trigger!
      ),
    onSuccess: () => {
      router.replace('/story');
    },
  });

  useEffect(() => {
    if (selectedProfile && category && trigger) {
      mutation.mutate();
    }
  }, [selectedProfile, category, trigger]);

  if (mutation.isError) {
    return (
      <ThemedView style={[styles.container, styles.background]}>
        <ThemedText style={styles.errorText}>
          Hmm, something went wrong.{"\n"}Let&apos;s try again.
        </ThemedText>
        <Pressable
          onPress={() => mutation.mutate()}
          style={({ pressed }) => [
            styles.button,
            pressed && { opacity: 0.85 },
          ]}
        >
          <GlassView glassEffectStyle="regular" style={styles.buttonGlass}>
            <ThemedText style={styles.buttonText}>Try Again</ThemedText>
          </GlassView>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <ThemedText style={styles.backText}>Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, styles.background]}>
      <BreathingCircle />
      <CalmingCopy />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.five,
  },
  background: {
    backgroundColor: Colors.dark.loadingBackground,
  },
  errorText: {
    color: Colors.dark.textSecondary,
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGlass: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  backText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
});
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/generate.tsx
git commit -m "feat(screen): add generate loading screen with breathing animation"
```

---

### Task 5: Wire handleGenerate in home screen to navigate

**Covers:** [S3]

**Files:**
- Modify: `src/app/index.tsx:1-38`

- [ ] **Step 1: Update handleGenerate to navigate**

Replace the entire `src/app/index.tsx`:

```typescript
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ChallengeMatrix } from '@/components/challenge-matrix';
import { ChallengeCategory, ChallengeTrigger } from '@/types';
import { ProfileSelector } from '@/components/profile-selector';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const handleGenerate = (category: ChallengeCategory, trigger: ChallengeTrigger) => {
    router.push({ pathname: '/generate', params: { category, trigger } });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ProfileSelector />
        <ChallengeMatrix onGenerate={handleGenerate} />
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
});
```

- [ ] **Step 2: Create placeholder `/story` route**

Create `src/app/story.tsx` so `router.replace('/story')` doesn't crash:

```typescript
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';

export default function StoryScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.text}>Story Card (US-1.4)</ThemedText>
      <ThemedText
        style={styles.link}
        onPress={() => router.back()}
      >
        Go Back
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    gap: Spacing.three,
  },
  text: {
    fontSize: 18,
  },
  link: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
});
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Verify lint passes**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/app/index.tsx src/app/story.tsx
git commit -m "feat(navigation): wire generate button to loading screen, add story placeholder"
```

---

### Task 6: Final verification

**Covers:** [S2]

- [ ] **Step 1: Run full typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Commit any fixups if needed**

```bash
git add -A
git commit -m "fix: address typecheck/lint issues for loading screen"
```

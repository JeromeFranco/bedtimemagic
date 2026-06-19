# Challenge Matrix — Premium Glass Morphism Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the ChallengeMatrix component with glass morphism, category-specific accent colors, and refined animations, then integrate it into the home screen.

**Architecture:** Modify existing `ChallengeMatrix` component in-place (no new files). Add category color constants to theme. Replace home screen static content with the matrix component.

**Tech Stack:** React Native, Expo, expo-glass-effect (GlassView), react-native-reanimated, TypeScript

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/constants/theme.ts` | Modify | Add `CATEGORY_COLORS` mapping |
| `src/components/challenge-matrix.tsx` | Modify | Full visual redesign |
| `src/app/index.tsx` | Modify | Integrate ChallengeMatrix, remove static content |

---

### Task 1: Add Category Accent Colors

**Covers:** [S3]

**Files:**
- Modify: `src/constants/theme.ts`

- [ ] **Step 1: Add CATEGORY_COLORS constant to theme.ts**

Add after the `MaxContentWidth` export:

```typescript
export const CATEGORY_COLORS = {
  screentime: {
    primary: '#60A5FA',
    tint: 'rgba(96,165,250,0.15)',
    tintStrong: 'rgba(96,165,250,0.20)',
    border: 'rgba(96,165,250,0.40)',
    borderSubtle: 'rgba(96,165,250,0.30)',
  },
  emotions: {
    primary: '#F59E0B',
    tint: 'rgba(245,158,11,0.15)',
    tintStrong: 'rgba(245,158,11,0.20)',
    border: 'rgba(245,158,11,0.40)',
    borderSubtle: 'rgba(245,158,11,0.30)',
  },
  bedtime: {
    primary: '#8B5CF6',
    tint: 'rgba(139,92,246,0.15)',
    tintStrong: 'rgba(139,92,246,0.20)',
    border: 'rgba(139,92,246,0.40)',
    borderSubtle: 'rgba(139,92,246,0.30)',
  },
  social: {
    primary: '#34D399',
    tint: 'rgba(52,211,153,0.15)',
    tintStrong: 'rgba(52,211,153,0.20)',
    border: 'rgba(52,211,153,0.40)',
    borderSubtle: 'rgba(52,211,153,0.30)',
  },
} as const;

export type CategoryColors = (typeof CATEGORY_COLORS)[ChallengeCategory];
```

Add the import for `ChallengeCategory` at the top:

```typescript
import { ChallengeCategory } from '@/types';
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/constants/theme.ts
git commit -m "feat(theme): add category-specific accent color palette"
```

---

### Task 2: Redesign ChallengeMatrix Component

**Covers:** [S4, S5, S6, S8]

**Files:**
- Modify: `src/components/challenge-matrix.tsx`

- [ ] **Step 1: Rewrite the CategoryCard component**

Replace the existing `CategoryCard` function with:

```typescript
function CategoryCard({ emoji, label, isSelected, categoryId, onPress }: CategoryCardProps) {
  const colors = CATEGORY_COLORS[categoryId];

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.categoryCard,
        isSelected && {
          backgroundColor: colors.tintStrong,
          borderColor: colors.border,
        },
      ]}
    >
      <GlassView
        glassEffectStyle="regular"
        tintColor={isSelected ? colors.tint : undefined}
        style={styles.categoryCardGlass}
      >
        <ThemedText style={styles.categoryEmoji}>{emoji}</ThemedText>
        <ThemedText
          style={[styles.categoryLabel, isSelected && { color: '#ffffff' }]}
        >
          {label}
        </ThemedText>
      </GlassView>
    </AnimatedPressable>
  );
}
```

Update the `CategoryCardProps` interface:

```typescript
interface CategoryCardProps {
  emoji: string;
  label: string;
  categoryId: ChallengeCategory;
  isSelected: boolean;
  onPress: () => void;
}
```

- [ ] **Step 2: Rewrite the TriggerChip component**

Replace the existing `TriggerChip` function with:

```typescript
function TriggerChip({ label, isSelected, categoryId, onPress }: TriggerChipProps) {
  const colors = CATEGORY_COLORS[categoryId];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.triggerChip,
        {
          backgroundColor: isSelected ? colors.tintStrong : colors.tint,
          borderColor: isSelected ? colors.borderSubtle : 'transparent',
        },
      ]}
    >
      <ThemedText
        style={[
          styles.triggerLabel,
          { color: isSelected ? '#ffffff' : colors.primary },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}
```

Update the `TriggerChipProps` interface:

```typescript
interface TriggerChipProps {
  label: string;
  isSelected: boolean;
  categoryId: ChallengeCategory;
  onPress: () => void;
}
```

- [ ] **Step 3: Rewrite the ChallengeMatrix component body**

Replace the existing `ChallengeMatrix` function with:

```typescript
export function ChallengeMatrix({ onGenerate }: ChallengeMatrixProps) {
  const [selectedCategory, setSelectedCategory] = useState<ChallengeCategory | null>(null);
  const [selectedTrigger, setSelectedTrigger] = useState<ChallengeTrigger | null>(null);

  const triggersForCategory = selectedCategory
    ? CHALLENGE_TRIGGERS.filter((t) => t.category === selectedCategory)
    : [];

  const handleCategoryPress = (category: ChallengeCategory) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setSelectedTrigger(null);
    } else {
      setSelectedCategory(category);
      setSelectedTrigger(null);
    }
  };

  const handleTriggerPress = (trigger: ChallengeTrigger) => {
    if (selectedTrigger === trigger) {
      setSelectedTrigger(null);
    } else {
      setSelectedTrigger(trigger);
    }
  };

  const canGenerate = selectedCategory !== null && selectedTrigger !== null;

  const handleGenerate = () => {
    if (canGenerate) {
      onGenerate(selectedCategory, selectedTrigger);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.heading}>What&apos;s on your mind tonight?</ThemedText>

      <ThemedView style={styles.tier1Grid}>
        {CHALLENGE_CATEGORIES.map((category) => (
          <CategoryCard
            key={category.id}
            emoji={category.emoji}
            label={category.label}
            categoryId={category.id}
            isSelected={selectedCategory === category.id}
            onPress={() => handleCategoryPress(category.id)}
          />
        ))}
      </ThemedView>

      {selectedCategory && (
        <Animated.View
          key={selectedCategory}
          entering={FadeInDown.duration(300)}
          exiting={FadeOut.duration(200)}
          layout={Layout.springify()}
          style={styles.tier2Container}
        >
          <ThemedView style={styles.tier2Row}>
            {triggersForCategory.map((trigger, index) => (
              <Animated.View
                key={trigger.id}
                entering={FadeInDown.delay(index * 80).duration(300)}
              >
                <TriggerChip
                  label={trigger.label}
                  isSelected={selectedTrigger === trigger.id}
                  categoryId={selectedCategory}
                  onPress={() => handleTriggerPress(trigger.id)}
                />
              </Animated.View>
            ))}
          </ThemedView>
        </Animated.View>
      )}

      {canGenerate && selectedCategory && (
        <Animated.View entering={FadeInUp.duration(250)}>
          <Pressable
            onPress={handleGenerate}
            style={[
              styles.generateButton,
              { backgroundColor: CATEGORY_COLORS[selectedCategory].primary },
            ]}
          >
            <ThemedText style={styles.generateButtonText}>Generate</ThemedText>
          </Pressable>
        </Animated.View>
      )}
    </ThemedView>
  );
}
```

- [ ] **Step 4: Update the imports**

Replace the existing imports with:

```typescript
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import { GlassView } from 'expo-glass-effect';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CATEGORY_COLORS, Spacing } from '@/constants/theme';
import {
  CHALLENGE_CATEGORIES,
  CHALLENGE_TRIGGERS,
  ChallengeCategory,
  ChallengeTrigger,
} from '@/types';
```

- [ ] **Step 5: Update the styles**

Replace the entire `StyleSheet.create` block with:

```typescript
const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  heading: {
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  tier1Grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two + 4,
    justifyContent: 'center',
  },
  categoryCard: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  categoryCardGlass: {
    padding: Spacing.three + 4,
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 16,
  },
  categoryEmoji: {
    fontSize: 40,
  },
  categoryLabel: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.8)',
  },
  tier2Container: {
    marginTop: Spacing.two,
  },
  tier2Row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'center',
  },
  triggerChip: {
    borderRadius: 20,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
  },
  triggerLabel: {
    fontWeight: '500',
  },
  generateButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  generateButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 18,
  },
});
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/components/challenge-matrix.tsx
git commit -m "feat(challenge-matrix): redesign with glass morphism and category accents"
```

---

### Task 3: Integrate ChallengeMatrix into Home Screen

**Covers:** [S7]

**Files:**
- Modify: `src/app/index.tsx`

- [ ] **Step 1: Rewrite the HomeScreen component**

Replace the entire file content with:

```typescript
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChallengeMatrix } from '@/components/challenge-matrix';
import { ProfileSelector } from '@/components/profile-selector';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const handleGenerate = (_category: string, _trigger: string) => {
    // TODO: Navigate to loading screen (US-1.3) and trigger story generation (US-2.1)
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

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/index.tsx
git commit -m "feat(home): integrate ChallengeMatrix, remove static content"
```

---

### Task 4: Final Verification

**Covers:** [S1, S2, S9]

- [ ] **Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run linter**

Run: `npx eslint src/`
Expected: No errors

- [ ] **Step 3: Verify the app builds**

Run: `npx expo export --platform web` (or `npx expo start` and check on device/simulator)
Expected: Build succeeds, no runtime errors

- [ ] **Step 4: Manual verification checklist**

Verify in the running app:
- [ ] ProfileSelector renders at top
- [ ] "What's on your mind tonight?" heading visible
- [ ] 4 category cards render in 2×2 grid with emojis
- [ ] Tapping a category card highlights it with its accent color
- [ ] Tapping a different category collapses old triggers, reveals new ones
- [ ] 3 trigger chips appear with cascading animation
- [ ] Selecting a trigger highlights it
- [ ] Generate button appears with category's solid color when both tiers selected
- [ ] Generate button logs selection to console
- [ ] No keyboard appears anywhere in the flow

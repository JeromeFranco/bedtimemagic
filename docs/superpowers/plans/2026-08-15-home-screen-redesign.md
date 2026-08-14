# Home Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the first screen (`src/app/(index,vault)/index.tsx`) into a calm, "continue-first" layout that surfaces a one-tap replay card for returning parents, warms the copy, removes DESIGN.md emoji-in-chrome violations, applies the theme's Typography presets per section, and introduces calmer vertical spacing.

**Architecture:** A new `RecentStoryCard` component (cover + title + protagonist subtitle + chevron) renders conditionally above a grouped "Or make a new one" label + `ChallengeMatrix`. The home screen switches from inline magic-number font styles to `ThemedText` `type` presets. Spacing moves from a flat 24px gap to 32px between major blocks with an 8px inner label→matrix group, following the spec's §5 spacing table.

**Tech Stack:** React Native 0.85, Expo Router 56, `react-native-reanimated` (mocked in tests), `expo-symbols` (`SymbolView`, already a dependency), `@testing-library/react-native` 14, Jest 29 (preset `jest-expo`). React Compiler is enabled.

## Global Constraints

(Copied from the spec and AGENTS.md — every task implicitly includes these.)

- Dark mode only; backgrounds are solid `Colors.dark.bgBase` — no gradients, no cold blues.
- System sans fonts app-wide (`Fonts.sans`) — do NOT introduce rounded/serif in this pass.
- No emoji in UI chrome. The child's profile avatar emoji (rendered by `ProfileSelector`) is identity, not chrome, and stays.
- Type weights: `400` (body/chip labels), `500` (section labels / nav), `700` (titles). Never `300` or `600`.
- Headline at 24px+ must use `letterSpacing: -0.24` (DESIGN.md §3b: -0.01em).
- One accent color per screen — only on the active category/trigger chip (unchanged `ChallengeMatrix`).
- 3-tap generation flow (category → trigger → "Create Tonight's Story") must not change.
- React Compiler is enabled: skip `useMemo`; skip `useCallback` unless the function is a `useEffect` dependency. The home-screen handlers are plain functions (matching current code).
- Never suppress lint (`// eslint-disable`, `// @ts-ignore`). No `react-hooks/*` disables inside a component.
- After every code change, run `npm run lint` and `npm run typecheck` and fix errors before committing.
- Conventional commit messages.

## File Structure

- **Create** `src/components/recent-story-card.tsx` — pure-props presentational component. One responsibility: render a tappable "continue listening" card for a single `Story`. No context dependencies.
- **Create** `src/components/__tests__/recent-story-card.test.tsx` — isolated unit tests for the card.
- **Create** `src/app/__tests__/home-screen.test.tsx` — integration tests for the home screen's conditional card + copy.
- **Modify** `src/app/(index,vault)/index.tsx` — new layout, copy, spacing, fonts; remove the old ghost replay button.
- **No change** to `src/components/challenge-matrix.tsx`, `src/components/profile-selector.tsx`, theme files, or `Card`/`Chip`.

### Deviation from spec (noted during planning)

The spec §3 said "Built on the existing `Card` component." The codebase's established pattern for story cards (`src/components/story-history-card.tsx`) builds a custom shell with `PressableFeedback` because `Card` does not forward accessibility props (`accessibilityLabel` / `accessibilityRole`) to its inner `PressableFeedback`. DESIGN.md §4 requires accessible labels on pressable cards. To honor both accessibility and the codebase pattern, `RecentStoryCard` builds a custom shell (bgSurface, rounded 16, border subtle) with `PressableFeedback` — mirroring `StoryHistoryCard`'s structure but with home-screen styling (no emoji, solid `bgElement` placeholder, chevron, bold title, protagonist + duration subtitle). This is a refinement of the spec, not a scope change; the visual result matches §3.

### Spacing note (resolves a spec inconsistency)

Spec §2's diagram showed "gap xl (24)" between the card and the section label, but spec §5's authoritative spacing table lists "Card → section label = 32 (outer gap) / Section label → matrix = sm (8)." This plan follows §5: a single `ScrollView` content `gap` of `Spacing['2xl']` (32) spaces all major blocks, and the label + `ChallengeMatrix` are wrapped in a `View` with `gap: Spacing.sm` (8) so the outer 32px gap does not push them apart.

---

## Task 1: RecentStoryCard component (TDD)

**Files:**
- Create: `src/components/recent-story-card.tsx`
- Test: `src/components/__tests__/recent-story-card.test.tsx`

**Interfaces:**
- Consumes: `Story` and `PROTAGONISTS` from `@/types`; `PressableFeedback` from `@/components/ui/pressable-feedback`; `ThemedText` from `@/components/themed-text`; `Colors`, `Spacing` from `@/theme`; `SymbolView` from `expo-symbols`; `Image`, `StyleSheet`, `View` from `react-native`.
- Produces: `RecentStoryCard({ story: Story; onPress: () => void })` — exported from `src/components/recent-story-card.tsx`. Used by Task 2.

- [ ] **Step 1: Write the failing tests**

Create `src/components/recent-story-card.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';

import { RecentStoryCard } from '../recent-story-card';
import type { Story } from '@/types';

const STORY: Story = {
  id: 'story-1',
  user_id: 'user-1',
  child_id: 'child-1',
  title: 'Mia and the Brave Toothbrush',
  story_text: 'Once upon a time.',
  moral: 'Brushing is brave.',
  pillow_talk_prompt: 'What was your favorite part?',
  sleepy_affirmation: 'I am brave.',
  cover_image_url: 'https://example.com/cover.png',
  challenge: 'refusing_teeth',
  protagonist: 'barnaby',
  created_at: '2026-08-14T00:00:00Z',
};

const NO_COVER_STORY: Story = {
  ...STORY,
  title: 'A Story Without Art',
  cover_image_url: null,
};

describe('RecentStoryCard', () => {
  it('renders the title and protagonist subtitle', async () => {
    const { getByText } = await render(
      <RecentStoryCard story={STORY} onPress={jest.fn()} />,
    );
    expect(getByText(STORY.title)).toBeTruthy();
    expect(getByText('Barnaby · 10 min')).toBeTruthy();
  });

  it('renders the cover image when a cover url is present', async () => {
    const { getByTestId, queryByTestId } = await render(
      <RecentStoryCard story={STORY} onPress={jest.fn()} />,
    );
    expect(getByTestId('recent-cover-image')).toBeTruthy();
    expect(queryByTestId('recent-cover-placeholder')).toBeNull();
  });

  it('renders a solid placeholder with no emoji when cover url is null', async () => {
    const { getByTestId, queryByTestId, queryByText } = await render(
      <RecentStoryCard story={NO_COVER_STORY} onPress={jest.fn()} />,
    );
    expect(getByTestId('recent-cover-placeholder')).toBeTruthy();
    expect(queryByTestId('recent-cover-image')).toBeNull();
    expect(queryByText('📖')).toBeNull();
    expect(queryByText('🐻')).toBeNull();
  });

  it('renders a chevron disclosure symbol', async () => {
    const { getByText } = await render(
      <RecentStoryCard story={STORY} onPress={jest.fn()} />,
    );
    expect(getByText('chevron.right')).toBeTruthy();
  });

  it('is an accessible button that fires onPress when pressed', async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await render(
      <RecentStoryCard story={STORY} onPress={onPress} />,
    );
    const card = getByLabelText(`Listen to ${STORY.title} again`);
    await fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

Notes for the implementer:
- `expo-symbols` is mocked in `jest.setup.js` to render `<Text>{name}</Text>` where `name` resolves to `name.ios` (`'chevron.right'`). That's why the chevron test matches the text `chevron.right`.
- The two `Story` fixtures are self-contained; no providers are needed because `RecentStoryCard` is pure-props and `useTheme()` returns `Colors.dark` directly (no provider).

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
npx jest src/components/__tests__/recent-story-card.test.tsx
```
Expected: FAIL with `Cannot find module '../recent-story-card'` (or similar module-not-found error).

- [ ] **Step 3: Implement `RecentStoryCard`**

Create `src/components/recent-story-card.tsx`:

```tsx
import { Image, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { PressableFeedback } from '@/components/ui/pressable-feedback';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/theme';
import { PROTAGONISTS, type Story } from '@/types';

interface RecentStoryCardProps {
  story: Story;
  onPress: () => void;
}

export function RecentStoryCard({ story, onPress }: RecentStoryCardProps) {
  const protagonist = PROTAGONISTS.find((p) => p.id === story.protagonist);
  const protagonistName = protagonist?.name ?? 'a friend';
  const hasCover = Boolean(story.cover_image_url);

  return (
    <View style={styles.shell}>
      <PressableFeedback
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Listen to ${story.title} again`}
        style={styles.content}
      >
        <View style={styles.coverContainer}>
          {hasCover ? (
            <Image
              source={{ uri: story.cover_image_url as string }}
              style={styles.cover}
              resizeMode="cover"
              testID="recent-cover-image"
            />
          ) : (
            <View testID="recent-cover-placeholder" style={styles.coverPlaceholder} />
          )}
        </View>

        <View style={styles.text}>
          <ThemedText type="link" style={styles.title} numberOfLines={2}>
            {story.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {`${protagonistName} · 10 min`}
          </ThemedText>
        </View>

        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={17}
          tintColor={Colors.dark.textMuted}
        />
      </PressableFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: Colors.dark.bgSurface,
    borderColor: Colors.dark.borderSubtle,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  coverContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.dark.bgElement,
  },
  text: {
    flex: 1,
    gap: Spacing.xs,
  },
  title: {
    fontWeight: '700',
  },
});
```

Notes for the implementer:
- The cover thumbnail uses a `coverContainer` with `borderRadius: 8` that clips the image. The image itself has no radius — this honors DESIGN.md §6 ("no border radius on the image itself; the container clips it") and matches the vault's `StoryHistoryCard` pattern.
- The placeholder is a solid `Colors.dark.bgElement` square with no emoji (DESIGN.md §7: no emoji in UI chrome).
- `PressableFeedback` spreads `{...rest}`, so `accessibilityRole` and `accessibilityLabel` reach the underlying `Pressable`.
- `ThemedText` applies the `style` prop last, so `fontWeight: '700'` overrides the `Typography.link` weight (400) for the title only; the subtitle uses the preset's 400 weight unchanged.

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```bash
npx jest src/components/__tests__/recent-story-card.test.tsx
```
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Lint and typecheck**

Run:
```bash
npm run lint && npm run typecheck
```
Expected: no errors. If `expo-symbols` `tintColor` or `name` shape is flagged, double-check against `src/components/ui/collapsible.tsx:23-28` (the established `SymbolView` usage) — the props here mirror it.

- [ ] **Step 6: Commit**

```bash
git add src/components/recent-story-card.tsx src/components/__tests__/recent-story-card.test.tsx
git commit -m "feat: add RecentStoryCard for continue-listening on home screen"
```

---

## Task 2: Integrate the card and redesign the home screen (TDD)

**Files:**
- Create: `src/app/__tests__/home-screen.test.tsx`
- Modify: `src/app/(index,vault)/index.tsx` (full file — see Step 3)

**Interfaces:**
- Consumes: `RecentStoryCard` from Task 1; `ChallengeMatrix`, `ProfileSelector`, `ThemedText`, `ThemedView`, `useSelectedChild`, `useStoryGeneration`, `useStories`, `Colors`/`Spacing`/`MaxContentWidth`/`BottomTabInset`, `PROTAGONISTS`/`ChallengeCategory`/`ChallengeTrigger`.
- Produces: the redesigned default export `HomeScreen` with the conditional `RecentStoryCard`, grouped label + matrix, warm copy, and `ThemedText` `type` presets.

- [ ] **Step 1: Write the failing integration tests**

Create `src/app/__tests__/home-screen.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';

import HomeScreen from '../(index,vault)/index';
import { router } from 'expo-router';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { useStoryGeneration } from '@/contexts/StoryGenerationContext';
import { useStories } from '@/hooks/use-story';
import type { Story } from '@/types';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/contexts/SelectedChildContext', () => ({ useSelectedChild: jest.fn() }));
jest.mock('@/contexts/StoryGenerationContext', () => ({ useStoryGeneration: jest.fn() }));
jest.mock('@/hooks/use-story', () => ({ useStories: jest.fn() }));
jest.mock('@/components/profile-selector', () => ({ ProfileSelector: () => null }));
jest.mock('@/components/challenge-matrix', () => ({ ChallengeMatrix: () => null }));

const mockPush = jest.mocked(router.push);
const mockUseStories = jest.mocked(useStories);
const mockUseSelectedChild = jest.mocked(useSelectedChild);
const mockUseStoryGeneration = jest.mocked(useStoryGeneration);

const STORY: Story = {
  id: 'story-1',
  user_id: 'user-1',
  child_id: 'child-1',
  title: 'Mia and the Brave Toothbrush',
  story_text: 'Once upon a time.',
  moral: 'Brushing is brave.',
  pillow_talk_prompt: 'What was your favorite part?',
  sleepy_affirmation: 'I am brave.',
  cover_image_url: 'https://example.com/cover.png',
  challenge: 'refusing_teeth',
  protagonist: 'barnaby',
  created_at: '2026-08-14T00:00:00Z',
};

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelectedChild.mockReturnValue({
      profiles: [],
      selectedProfile: {
        id: 'child-1',
        user_id: 'user-1',
        name: 'Mia',
        developmental_stage: 'preschool',
        protagonist: 'barnaby',
        emoji: '🌙',
        created_at: '2026-08-13T00:00:00Z',
      },
      setSelectedProfile: jest.fn(),
    } as never);
    mockUseStoryGeneration.mockReturnValue({ startGeneration: jest.fn() } as never);
  });

  it('renders the warm headline and subtitle and no recent card when there is no recent story', async () => {
    mockUseStories.mockReturnValue({ data: [] } as never);

    const { getByText, queryByText } = await render(<HomeScreen />);

    expect(getByText("Tonight's story for Mia")).toBeTruthy();
    expect(getByText('Barnaby will tell it · about 10 minutes')).toBeTruthy();
    expect(queryByText('Or make a new one')).toBeNull();
    expect(queryByText(STORY.title)).toBeNull();
  });

  it('renders the recent card and section label, and routes to /story on press', async () => {
    mockUseStories.mockReturnValue({ data: [STORY] } as never);

    const view = await render(<HomeScreen />);

    expect(view.getByText('Or make a new one')).toBeTruthy();
    expect(view.getByText(STORY.title)).toBeTruthy();
    expect(view.getByLabelText(`Listen to ${STORY.title} again`)).toBeTruthy();

    await fireEvent.press(view.getByText(STORY.title));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/story',
      params: { id: 'story-1' },
    });
  });
});
```

Notes for the implementer:
- These mocks mirror the proven pattern in `src/app/__tests__/vault.test.tsx` and `story-generation-workflow.test.tsx`. `ProfileSelector` and `ChallengeMatrix` are mocked to `null` to isolate the home screen's own structure (the conditional card + copy + label). The real `RecentStoryCard` from Task 1 is exercised end-to-end (its tests already cover press/accessibility; here we verify the wiring + navigation).
- Press is fired via `getByText(STORY.title)` (the title lives inside the `PressableFeedback`), matching the vault test's proven press pattern. The accessibility label is also asserted via `getByLabelText` to verify the screen-reader experience.
- `SafeAreaView` renders fine without a `SafeAreaProvider` in tests (the existing workflow tests render `HomeScreen` the same way), so no provider wrapping is needed.

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
npx jest src/app/__tests__/home-screen.test.tsx
```
Expected: FAIL — the headline assertion fails because the current headline is `"What's happening with Mia tonight?"` (no `RecentStoryCard`, no "Or make a new one" label, wrong subtitle copy).

- [ ] **Step 3: Rewrite `src/app/(index,vault)/index.tsx`**

Replace the entire file contents with:

```tsx
import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChallengeMatrix } from '@/components/challenge-matrix';
import { ProfileSelector } from '@/components/profile-selector';
import { RecentStoryCard } from '@/components/recent-story-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { useStoryGeneration } from '@/contexts/StoryGenerationContext';
import { useStories } from '@/hooks/use-story';
import { BottomTabInset, Colors, MaxContentWidth, Spacing } from '@/theme';
import { ChallengeCategory, ChallengeTrigger, PROTAGONISTS } from '@/types';

export default function HomeScreen() {
  const { selectedProfile } = useSelectedChild();
  const { startGeneration } = useStoryGeneration();
  const { data: stories } = useStories(selectedProfile?.id);
  const recentStory = stories && stories.length > 0 ? stories[0] : null;

  const protagonist = selectedProfile
    ? PROTAGONISTS.find((p) => p.id === selectedProfile.protagonist)
    : null;

  const handleGenerate = (category: ChallengeCategory, trigger: ChallengeTrigger) => {
    if (!selectedProfile) return;

    startGeneration({
      childId: selectedProfile.id,
      childName: selectedProfile.name,
      protagonist: selectedProfile.protagonist,
      developmentalStage: selectedProfile.developmental_stage,
      category,
      trigger,
    });
    router.push('/generate');
  };

  const handleReplayPress = () => {
    if (recentStory) {
      router.push({ pathname: '/story', params: { id: recentStory.id } });
    }
  };

  const childName = selectedProfile?.name;
  const headline = childName ? `Tonight's story for ${childName}` : "Tonight's story";
  const protagonistName = protagonist?.name ?? 'Barnaby';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.headerRow}>
            <ThemedView style={styles.headerText}>
              <ThemedText type="title" style={styles.headline}>
                {headline}
              </ThemedText>
              <ThemedText type="link" themeColor="textSecondary">
                {`${protagonistName} will tell it · about 10 minutes`}
              </ThemedText>
            </ThemedView>

            <ProfileSelector />
          </ThemedView>

          {recentStory && (
            <RecentStoryCard story={recentStory} onPress={handleReplayPress} />
          )}

          <ThemedView style={styles.newStoryGroup}>
            {recentStory && (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.sectionLabel}
              >
                Or make a new one
              </ThemedText>
            )}
            <ChallengeMatrix onGenerate={handleGenerate} />
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgBase,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: BottomTabInset + Spacing.xl,
    gap: Spacing['2xl'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    backgroundColor: 'transparent',
  },
  headerText: {
    flex: 1,
    gap: Spacing.xs,
    backgroundColor: 'transparent',
  },
  headline: {
    letterSpacing: -0.24,
  },
  newStoryGroup: {
    gap: Spacing.sm,
    backgroundColor: 'transparent',
  },
  sectionLabel: {
    fontWeight: '500',
  },
});
```

Notes for the implementer (what changed and why):
- **Copy:** headline → `"Tonight's story for {childName}"` (falls back to `"Tonight's story"` when no child is selected); subtitle → `"{protagonistName} will tell it · about 10 minutes"` (no emoji). The old ghost replay button (`"Listen to recent story again →"`) is removed; its handler now lives on the `RecentStoryCard`.
- **Fonts:** inline `fontSize`/`fontWeight`/`lineHeight`/`color` magic numbers replaced with `ThemedText` `type` presets — `type="title"` (24/30/700) for the headline, `type="link"` (15/22/400) for the subtitle, `type="small"` (13/18/400) for the section label. The headline keeps `letterSpacing: -0.24` (DESIGN.md §3b). The section label overrides `fontWeight: '500'` (DESIGN.md §3b: 500 for section headers). Card text styles are owned by `RecentStoryCard` (Task 1).
- **Spacing:** `ScrollView` content `gap` is `Spacing['2xl']` (32), up from `Spacing.xl` (24) — the primary "calmer" lever. The "Or make a new one" label and `ChallengeMatrix` are wrapped in `newStoryGroup` with `gap: Spacing.sm` (8) so the outer 32px gap spaces the group from the card while the label stays close to the matrix it introduces. The redundant `marginTop: Spacing.xs` on the old `topRow` is removed.
- **Conditional rendering:** the card and the section label render only when `recentStory` exists. When there is no recent story, the headline flows directly into `ChallengeMatrix` via the 32px gap (no "No stories yet" empty state, per DESIGN.md §7).
- **Unchanged:** `handleGenerate` and the 3-tap flow; `ProfileSelector` top-right; `SafeAreaView` + `MaxContentWidth` centering; solid `bgBase`.

- [ ] **Step 4: Run the home-screen tests to verify they pass**

Run:
```bash
npx jest src/app/__tests__/home-screen.test.tsx
```
Expected: PASS — both tests green.

- [ ] **Step 5: Run the full test suite to verify no regressions**

Run:
```bash
npm run test:ci
```
Expected: PASS — the existing `story-generation-workflow.test.tsx` still passes (it mocks `useStories` to `{ data: [] }`, mocks `ChallengeMatrix` and `ProfileSelector`, and never queries the headline/subtitle/replay copy, so the redesign is invisible to its assertions). The vault test and story test are unaffected.

- [ ] **Step 6: Lint and typecheck**

Run:
```bash
npm run lint && npm run typecheck
```
Expected: no errors. Watch for unused imports (the old `View` import and `Button` import are gone — make sure they're removed; the new file imports only `ScrollView`, `StyleSheet` from `react-native`).

- [ ] **Step 7: Commit**

```bash
git add src/app/(index,vault)/index.tsx src/app/__tests__/home-screen.test.tsx
git commit -m "feat: redesign home screen with continue-first layout and calmer rhythm"
```

---

## Task 3: Final verification

- [ ] **Step 1: Clean full run**

Run:
```bash
npm run lint && npm run typecheck && npm run test:ci
```
Expected: all green, no warnings introduced by this work.

- [ ] **Step 2: Spot-check DESIGN.md compliance (manual, no code change)**

Verify against the spec's §9 checklist by reading the final `index.tsx` + `recent-story-card.tsx`:
- No emoji anywhere in chrome (the only emoji is the child's avatar inside `ProfileSelector`).
- Headline uses `type="title"` + `letterSpacing: -0.24`.
- Subtitle uses `type="link"`, `themeColor="textSecondary"`, no emoji.
- Section label uses `type="small"` + `fontWeight: '500'`.
- Card uses `bgSurface`, rounded 16, border subtle, no shadow.
- Cover thumbnail is 56×56, 1:1, clipped by an 8px-radius container (no radius on the image).
- Placeholder is solid `bgElement`, no emoji.
- One accent color on screen (only the active chip inside `ChallengeMatrix`).
- 3-tap generation flow intact.

If any item fails, fix it in the relevant file and re-run Step 1 before declaring done. Do not change `challenge-matrix.tsx` (the spec's default is to leave its internal spacing unchanged).

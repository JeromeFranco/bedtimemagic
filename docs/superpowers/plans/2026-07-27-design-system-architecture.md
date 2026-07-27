# Design System Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate Bedtime Magic's design tokens into a top-level `@/theme` module with semantic T-shirt spacing, structured typography tokens & presets, standardized border radius & layout tokens, and 100% backwards compatibility via `src/constants/theme.ts`.

**Architecture:** Create modular token files in `src/theme/` (`colors.ts`, `spacing.ts`, `typography.ts`, `radius.ts`, `layout.ts`, `index.ts`), update `src/constants/theme.ts` as a re-export shim with legacy spacing aliases, and refactor `ThemedText` to consume `Typography` presets directly.

**Tech Stack:** React Native 0.85, Expo SDK 56, TypeScript, `@expo/ui` / `StyleSheet`

## Global Constraints

- **Conventional Commits:** Use conventional commit messages (`feat:`, `refactor:`, `docs:`, `fix:`).
- **Quality Gates:** Run `npm run lint` and `npm run typecheck` after changes; zero errors allowed.
- **No Suppressions:** Never add `// eslint-disable` or `// @ts-ignore` without explicit user permission.
- **Backwards Compatibility:** All existing imports from `@/constants/theme` must continue to work without breaking.

---

### Task 1: Create Core Token Modules (`colors.ts`, `spacing.ts`, `radius.ts`, `layout.ts`)

**Files:**
- Create: `src/theme/colors.ts`
- Create: `src/theme/spacing.ts`
- Create: `src/theme/radius.ts`
- Create: `src/theme/layout.ts`

**Interfaces:**
- Consumes: None
- Produces: `Colors`, `CATEGORY_COLORS`, `ThemeColor`, `CategoryColors`, `Spacing`, `SpacingToken`, `BorderRadius`, `BorderRadiusToken`, `Layout`

- [ ] **Step 1: Create `src/theme/colors.ts`**

```typescript
import { ChallengeCategory } from '@/types';

export const Colors = {
  dark: {
    // Backgrounds
    bgDeepest: '#060A1A',
    bgBase: '#0F1328',
    bgSurface: '#171C38',
    bgElement: '#1F2545',
    bgElementHover: '#282F55',
    bgSelected: '#2D345C',
    // Borders
    borderSubtle: '#232848',
    borderDefault: '#2E3560',
    // Text
    textPrimary: '#E2E0F0',
    textSecondary: '#8E8AA8',
    textMuted: '#5C5878',
    // Semantic
    success: '#7BC4A8',
    warning: '#D4A06A',
    error: '#D47A6A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.dark;

export const CATEGORY_COLORS = {
  screentime: {
    primary: '#7EB8E0',
    tint: 'rgba(126,184,224,0.12)',
    tintLight: 'rgba(126,184,224,0.06)',
    tintStrong: 'rgba(126,184,224,0.18)',
    tintSelected: 'rgba(126,184,224,0.24)',
    textMuted: 'rgba(126,184,224,0.65)',
    border: 'rgba(126,184,224,0.35)',
    borderSubtle: 'rgba(126,184,224,0.25)',
  },
  emotions: {
    primary: '#D4A06A',
    tint: 'rgba(212,160,106,0.12)',
    tintLight: 'rgba(212,160,106,0.06)',
    tintStrong: 'rgba(212,160,106,0.18)',
    tintSelected: 'rgba(212,160,106,0.24)',
    textMuted: 'rgba(212,160,106,0.65)',
    border: 'rgba(212,160,106,0.35)',
    borderSubtle: 'rgba(212,160,106,0.25)',
  },
  bedtime: {
    primary: '#A07BD4',
    tint: 'rgba(160,123,212,0.12)',
    tintLight: 'rgba(160,123,212,0.06)',
    tintStrong: 'rgba(160,123,212,0.18)',
    tintSelected: 'rgba(160,123,212,0.24)',
    textMuted: 'rgba(160,123,212,0.65)',
    border: 'rgba(160,123,212,0.35)',
    borderSubtle: 'rgba(160,123,212,0.25)',
  },
  social: {
    primary: '#7BC4A8',
    tint: 'rgba(123,196,168,0.12)',
    tintLight: 'rgba(123,196,168,0.06)',
    tintStrong: 'rgba(123,196,168,0.18)',
    tintSelected: 'rgba(123,196,168,0.24)',
    textMuted: 'rgba(123,196,168,0.65)',
    border: 'rgba(123,196,168,0.35)',
    borderSubtle: 'rgba(123,196,168,0.25)',
  },
} as const;

export type CategoryColors = (typeof CATEGORY_COLORS)[ChallengeCategory];
```

- [ ] **Step 2: Create `src/theme/spacing.ts`**

```typescript
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export type SpacingToken = keyof typeof Spacing;
```

- [ ] **Step 3: Create `src/theme/radius.ts`**

```typescript
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 9999,
} as const;

export type BorderRadiusToken = keyof typeof BorderRadius;
```

- [ ] **Step 4: Create `src/theme/layout.ts`**

```typescript
import { Platform } from 'react-native';

export const Layout = {
  bottomTabInset: Platform.select({ ios: 50, android: 80 }) ?? 0,
  maxContentWidth: 800,
  screenMargin: 16,
  sectionPadding: 24,
  cardPadding: 16,
  chipHeight: 40,
  minTouchTarget: 44,
} as const;

export const BottomTabInset = Layout.bottomTabInset;
export const MaxContentWidth = Layout.maxContentWidth;
```

- [ ] **Step 5: Run typecheck to verify Task 1 compilation**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit Task 1**

```bash
git add src/theme/colors.ts src/theme/spacing.ts src/theme/radius.ts src/theme/layout.ts
git commit -m "feat(theme): add core design tokens for colors, spacing, radius, and layout"
```

---

### Task 2: Create Typography System Module (`src/theme/typography.ts`)

**Files:**
- Create: `src/theme/typography.ts`

**Interfaces:**
- Consumes: Platform from 'react-native'
- Produces: `Fonts`, `FontSizes`, `LineHeights`, `FontWeights`, `LetterSpacings`, `Typography`, `TypographyPreset`

- [ ] **Step 1: Create `src/theme/typography.ts`**

```typescript
import { TextStyle, Platform } from 'react-native';

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});

export const FontSizes = {
  caption: 11,
  code: 12,
  small: 13,
  link: 15,
  body: 17,
  heading: 20,
  title: 24,
  subtitle: 32,
  hero: 40,
} as const;

export const LineHeights = {
  caption: 14,
  code: 16,
  small: 18,
  link: 22,
  body: 24,
  heading: 28,
  title: 30,
  subtitle: 40,
  hero: 44,
} as const;

export const FontWeights = {
  regular: '400',
  medium: '500',
  bold: '700',
} as const;

export const LetterSpacings = {
  hero: -0.4,
  subtitle: -0.32,
  normal: 0,
} as const;

export const Typography = {
  hero: {
    fontSize: FontSizes.hero,
    lineHeight: LineHeights.hero,
    fontWeight: FontWeights.bold,
    letterSpacing: LetterSpacings.hero,
  },
  subtitle: {
    fontSize: FontSizes.subtitle,
    lineHeight: LineHeights.subtitle,
    fontWeight: FontWeights.bold,
    letterSpacing: LetterSpacings.subtitle,
  },
  title: {
    fontSize: FontSizes.title,
    lineHeight: LineHeights.title,
    fontWeight: FontWeights.bold,
  },
  heading: {
    fontSize: FontSizes.heading,
    lineHeight: LineHeights.heading,
    fontWeight: FontWeights.medium,
  },
  body: {
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontWeight: FontWeights.regular,
  },
  default: {
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontWeight: FontWeights.regular,
  },
  small: {
    fontSize: FontSizes.small,
    lineHeight: LineHeights.small,
    fontWeight: FontWeights.regular,
  },
  smallBold: {
    fontSize: FontSizes.small,
    lineHeight: LineHeights.small,
    fontWeight: FontWeights.bold,
  },
  caption: {
    fontSize: FontSizes.caption,
    lineHeight: LineHeights.caption,
    fontWeight: FontWeights.regular,
  },
  link: {
    fontSize: FontSizes.link,
    lineHeight: LineHeights.link,
    fontWeight: FontWeights.regular,
  },
  linkPrimary: {
    fontSize: FontSizes.link,
    lineHeight: LineHeights.link,
    fontWeight: FontWeights.regular,
  },
  code: {
    fontFamily: Fonts?.mono,
    fontWeight: (Platform.select({ android: FontWeights.bold }) ?? FontWeights.medium) as TextStyle['fontWeight'],
    fontSize: FontSizes.code,
    lineHeight: LineHeights.code,
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyPreset = keyof typeof Typography;
```

- [ ] **Step 2: Run typecheck to verify Typography compilation**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit Task 2**

```bash
git add src/theme/typography.ts
git commit -m "feat(theme): add typography tokens and composite presets"
```

---

### Task 3: Theme Entrypoint & Re-Export Compatibility Shim

**Files:**
- Create: `src/theme/index.ts`
- Modify: `src/constants/theme.ts`

**Interfaces:**
- Consumes: Tokens from `src/theme/*`
- Produces: `@/theme` index, `src/constants/theme.ts` shim with legacy `Spacing` aliases (`half`, `one`, `two`, `twoHalf`, `three`, `four`, `five`, `six`, `seven`)

- [ ] **Step 1: Create `src/theme/index.ts`**

```typescript
import { Colors } from './colors';
import { Layout } from './layout';
import { BorderRadius } from './radius';
import { Spacing } from './spacing';
import { Typography } from './typography';

export * from './colors';
export * from './spacing';
export * from './typography';
export * from './radius';
export * from './layout';

export const Theme = {
  colors: Colors.dark,
  spacing: Spacing,
  typography: Typography,
  radius: BorderRadius,
  layout: Layout,
} as const;

export type ThemeType = typeof Theme;
```

- [ ] **Step 2: Update `src/constants/theme.ts` for backwards compatibility**

```typescript
/**
 * Bedtime Magic design tokens shim for backwards compatibility.
 * Re-exports modern design system tokens from `@/theme`.
 * See DESIGN.md for full specification.
 */

import { Spacing as SemanticSpacing } from '@/theme/spacing';

export * from '@/theme';

/** Legacy word-based spacing map pointing to semantic T-shirt spacing */
export const Spacing = {
  ...SemanticSpacing,
  half: SemanticSpacing.xxs,
  one: SemanticSpacing.xs,
  two: SemanticSpacing.sm,
  twoHalf: SemanticSpacing.md,
  three: SemanticSpacing.lg,
  four: SemanticSpacing.xl,
  five: SemanticSpacing['2xl'],
  six: SemanticSpacing['3xl'],
  seven: SemanticSpacing['4xl'],
} as const;
```

- [ ] **Step 3: Run typecheck & lint to verify compatibility shim**

Run: `npm run typecheck && npm run lint`
Expected: PASS with 0 errors

- [ ] **Step 4: Commit Task 3**

```bash
git add src/theme/index.ts src/constants/theme.ts
git commit -m "feat(theme): add unified @/theme entrypoint and backwards compatibility shim"
```

---

### Task 4: Refactor `ThemedText` & Verification

**Files:**
- Modify: `src/components/themed-text.tsx`

**Interfaces:**
- Consumes: `Typography`, `TypographyPreset` from `@/theme`
- Produces: Refactored `ThemedText` component driven by `Typography` presets

- [ ] **Step 1: Refactor `src/components/themed-text.tsx`**

```typescript
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Colors, ThemeColor, Typography, TypographyPreset } from '@/theme';

export type ThemedTextProps = TextProps & {
  type?: TypographyPreset;
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'textPrimary'] },
        type === 'linkPrimary' && styles.linkPrimary,
        styles[type],
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  hero: Typography.hero,
  subtitle: Typography.subtitle,
  title: Typography.title,
  heading: Typography.heading,
  body: Typography.body,
  default: Typography.default,
  small: Typography.small,
  smallBold: Typography.smallBold,
  caption: Typography.caption,
  link: Typography.link,
  linkPrimary: {
    ...Typography.linkPrimary,
    color: Colors.dark.textPrimary,
  },
  code: Typography.code,
});
```

- [ ] **Step 2: Run full verification (typecheck & lint)**

Run: `npm run typecheck && npm run lint`
Expected: PASS with 0 errors

- [ ] **Step 3: Commit Task 4**

```bash
git add src/components/themed-text.tsx
git commit -m "refactor(ui): update ThemedText to use theme typography presets"
```

---

## Plan Self-Review Checklist

- [x] **Spec coverage:** All items in spec covered (Colors, Spacing T-shirt scale, Typography scale & presets, Radius, Layout, Backwards compatibility, ThemedText refactor).
- [x] **Placeholder scan:** No TBD/TODO or vague instructions.
- [x] **Type consistency:** Exported types (`ThemeColor`, `CategoryColors`, `SpacingToken`, `TypographyPreset`, `BorderRadiusToken`) match across all tasks.

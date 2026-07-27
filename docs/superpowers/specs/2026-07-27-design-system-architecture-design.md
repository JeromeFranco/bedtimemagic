# Design System Architecture Specification — Bedtime Magic

**Date:** 2026-07-27  
**Status:** Approved  
**Author:** Antigravity & User  

---

## 1. Overview & Objectives

This specification outlines the architecture for Bedtime Magic's modernized design system. The goal is to elevate design tokens from simple constants in `src/constants/theme.ts` into a top-level `@/theme` module while adhering strictly to `DESIGN.md` guidelines and modern Expo/React Native best practices.

### Key Goals
- **Top-Level Module:** Establish `@/theme` as the primary design system entry point.
- **Backwards Compatibility:** Re-export tokens from `src/constants/theme.ts` (including legacy spacing aliases) so existing code continues to work without breaking changes.
- **Semantic Spacing Scale:** Transition from word-based spacing names (`one`, `two`, `twoHalf`) to T-shirt sizing (`xxs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl`).
- **Typography Tokens:** Expose primitive scale tokens (`FontSizes`, `LineHeights`, `FontWeights`, `LetterSpacings`) and composite presets (`Typography.hero`, `Typography.title`, `Typography.subtitle`, `Typography.body`, `Typography.caption`, `Typography.link`, `Typography.code`).
- **Border Radius & Layout Tokens:** Standardize `BorderRadius` (`sm`, `md`, `lg`, `pill`) and `Layout` metrics (`bottomTabInset`, `maxContentWidth`, `screenMargin`, `cardPadding`, `chipHeight`, `minTouchTarget`).
- **Component Refactoring:** Update `ThemedText` to consume the new `Typography` presets directly.

---

## 2. System Architecture & File Structure

```
src/
├── theme/
│   ├── colors.ts       # Color tokens (dark palette & category colors)
│   ├── spacing.ts      # Semantic T-shirt spacing scale
│   ├── typography.ts   # Typography scales & composite presets
│   ├── radius.ts       # Border radius tokens
│   ├── layout.ts       # Layout & touch target metrics
│   └── index.ts        # Unified theme export & useTheme hook
└── constants/
    └── theme.ts        # Re-export shim for 100% backwards compatibility
```

---

## 3. Detailed Token Specifications

### 3.1 Colors (`src/theme/colors.ts`)

Dark mode only (warm indigo sky aesthetic):
- **Neutral Scale:**
  - `bgDeepest`: `#060A1A`
  - `bgBase`: `#0F1328`
  - `bgSurface`: `#171C38`
  - `bgElement`: `#1F2545`
  - `bgElementHover`: `#282F55`
  - `bgSelected`: `#2D345C`
  - `borderSubtle`: `#232848`
  - `borderDefault`: `#2E3560`
- **Text Scale:**
  - `textPrimary`: `#E2E0F0`
  - `textSecondary`: `#8E8AA8`
  - `textMuted`: `#5C5878`
- **Semantic Scale:**
  - `success`: `#7BC4A8`
  - `warning`: `#D4A06A`
  - `error`: `#D47A6A`
- **Category Accents (`CATEGORY_COLORS`):**
  - `screentime` (`#7EB8E0`), `emotions` (`#D4A06A`), `bedtime` (`#A07BD4`), `social` (`#7BC4A8`)

### 3.2 Spacing (`src/theme/spacing.ts`)

Base unit: 4px. Scale:
- `xxs`: 2
- `xs`: 4
- `sm`: 8
- `md`: 12
- `lg`: 16
- `xl`: 24
- `2xl`: 32
- `3xl`: 48
- `4xl`: 64

### 3.3 Typography (`src/theme/typography.ts`)

- **Font Families (`Fonts`):** System fonts for iOS and Android (`sans`, `serif`, `rounded`, `mono`).
- **Font Sizes (`FontSizes`):** `caption` (11), `code` (12), `small` (13), `link` (15), `body` (17), `heading` (20), `title` (24), `subtitle` (32), `hero` (40).
- **Line Heights (`LineHeights`):** `caption` (14), `code` (16), `small` (18), `link` (22), `body` (24), `heading` (28), `title` (30), `subtitle` (40), `hero` (44).
- **Font Weights (`FontWeights`):** `regular` ('400'), `medium` ('500'), `bold` ('700').
- **Letter Spacings (`LetterSpacings`):** `hero` (-0.4), `subtitle` (-0.32), `normal` (0).
- **Composite Typography Presets (`Typography`):**
  - `hero`: size 40, weight 700, line-height 44, tracking -0.4
  - `subtitle`: size 32, weight 700, line-height 40, tracking -0.32
  - `title`: size 24, weight 700, line-height 30
  - `heading`: size 20, weight 500, line-height 28
  - `body`: size 17, weight 400, line-height 24
  - `small`: size 13, weight 400, line-height 18
  - `smallBold`: size 13, weight 700, line-height 18
  - `caption`: size 11, weight 400, line-height 14
  - `link`: size 15, weight 400, line-height 22
  - `linkPrimary`: size 15, weight 400, line-height 22, textPrimary color
  - `code`: size 12, mono font, medium/bold weight

### 3.4 Border Radius (`src/theme/radius.ts`)

- `sm`: 8 (inputs, small chips)
- `md`: 12 (primary buttons, standard chips)
- `lg`: 16 (cards, modals)
- `pill`: 9999 (full rounded chips)

### 3.5 Layout (`src/theme/layout.ts`)

- `bottomTabInset`: Platform specific (iOS 50, Android 80)
- `maxContentWidth`: 800
- `screenMargin`: 16
- `sectionPadding`: 24
- `cardPadding`: 16
- `chipHeight`: 40
- `minTouchTarget`: 44

---

## 4. Backwards Compatibility & Integration

- `src/constants/theme.ts` re-exports `Colors`, `Fonts`, `Spacing`, `BottomTabInset`, `MaxContentWidth`, `CATEGORY_COLORS`, `ThemeColor`, and `CategoryColors`.
- `Spacing` in `src/constants/theme.ts` includes legacy getters/aliases (`half`, `one`, `two`, `twoHalf`, `three`, `four`, `five`, `six`, `seven`) pointing to `Spacing` T-shirt values.
- `ThemedText` in `src/components/themed-text.tsx` is updated to consume `Typography` presets directly from `@/theme`.

---

## 5. Verification Plan

1. **Static Type Safety:** Run `npm run typecheck` to verify no type regressions across `@/theme` or `src/constants/theme.ts`.
2. **Lint Verification:** Run `npm run lint` to confirm code style and compliance.

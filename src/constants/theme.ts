/**
 * Bedtime Magic design tokens shim for backwards compatibility.
 * Re-exports modern design system tokens from `@/theme`.
 * See DESIGN.md for full specification.
 */

import { Spacing as SemanticSpacing } from '@/theme/spacing';

export {
  Colors,
  type ThemeColor,
  CATEGORY_COLORS,
  type CategoryColors,
  type SpacingToken,
  Fonts,
  FontSizes,
  LineHeights,
  FontWeights,
  LetterSpacings,
  Typography,
  type TypographyPreset,
  BorderRadius,
  type BorderRadiusToken,
  Layout,
  BottomTabInset,
  MaxContentWidth,
  Theme,
  type ThemeType,
} from '@/theme';

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

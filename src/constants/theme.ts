/**
 * Bedtime Magic design tokens — dark mode only.
 * See DESIGN.md for the full design system specification.
 */

import { Platform } from 'react-native';
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

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  twoHalf: 12,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
  seven: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

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

/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 */

import { Platform } from 'react-native';
import { ChallengeCategory } from '@/types';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const CATEGORY_COLORS = {
  screentime: {
    primary: '#60A5FA',
    tint: 'rgba(96,165,250,0.15)',
    tintLight: 'rgba(96,165,250,0.08)',
    tintStrong: 'rgba(96,165,250,0.20)',
    tintSelected: 'rgba(96,165,250,0.25)',
    textMuted: 'rgba(96,165,250,0.70)',
    border: 'rgba(96,165,250,0.40)',
    borderSubtle: 'rgba(96,165,250,0.30)',
  },
  emotions: {
    primary: '#F59E0B',
    tint: 'rgba(245,158,11,0.15)',
    tintLight: 'rgba(245,158,11,0.08)',
    tintStrong: 'rgba(245,158,11,0.20)',
    tintSelected: 'rgba(245,158,11,0.25)',
    textMuted: 'rgba(245,158,11,0.70)',
    border: 'rgba(245,158,11,0.40)',
    borderSubtle: 'rgba(245,158,11,0.30)',
  },
  bedtime: {
    primary: '#8B5CF6',
    tint: 'rgba(139,92,246,0.15)',
    tintLight: 'rgba(139,92,246,0.08)',
    tintStrong: 'rgba(139,92,246,0.20)',
    tintSelected: 'rgba(139,92,246,0.25)',
    textMuted: 'rgba(139,92,246,0.70)',
    border: 'rgba(139,92,246,0.40)',
    borderSubtle: 'rgba(139,92,246,0.30)',
  },
  social: {
    primary: '#34D399',
    tint: 'rgba(52,211,153,0.15)',
    tintLight: 'rgba(52,211,153,0.08)',
    tintStrong: 'rgba(52,211,153,0.20)',
    tintSelected: 'rgba(52,211,153,0.25)',
    textMuted: 'rgba(52,211,153,0.70)',
    border: 'rgba(52,211,153,0.40)',
    borderSubtle: 'rgba(52,211,153,0.30)',
  },
} as const;

export type CategoryColors = (typeof CATEGORY_COLORS)[ChallengeCategory];

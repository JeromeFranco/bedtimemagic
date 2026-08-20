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
    // Overlays & scrims
    scrim: 'rgba(0, 0, 0, 0.5)',
    overlay: 'rgba(6, 10, 26, 0.8)',
    systemBarScrimTop: '#060A1A',
    systemBarScrimBottom: 'rgba(6, 10, 26, 0)',
    // Special-purpose fills
    track: 'rgba(226, 224, 240, 0.15)',
    avatarTint: 'rgba(255, 255, 255, 0.1)',
    accentSoft: 'rgba(139, 92, 246, 0.2)',
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

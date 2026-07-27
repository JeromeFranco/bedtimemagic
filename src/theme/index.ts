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

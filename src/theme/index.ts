import { Colors } from './colors';
import { Layout } from './layout';
import { Motion } from './motion';
import { BorderRadius } from './radius';
import { Spacing } from './spacing';
import { Typography } from './typography';

export * from './colors';
export * from './spacing';
export * from './typography';
export * from './radius';
export * from './layout';
export * from './motion';

export const Theme = {
  colors: Colors.dark,
  spacing: Spacing,
  typography: Typography,
  radius: BorderRadius,
  layout: Layout,
  motion: Motion,
} as const;

export type ThemeType = typeof Theme;

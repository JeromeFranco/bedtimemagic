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

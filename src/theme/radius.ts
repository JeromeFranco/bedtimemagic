export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 9999,
} as const;

export type BorderRadiusToken = keyof typeof BorderRadius;

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

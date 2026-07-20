import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'textPrimary'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 400,
  },
  smallBold: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 700,
  },
  default: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: 400,
  },
  title: {
    fontSize: 40,
    fontWeight: 700,
    lineHeight: 44,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: 700,
    letterSpacing: -0.32,
  },
  link: {
    fontSize: 15,
    lineHeight: 22,
  },
  linkPrimary: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.dark.textPrimary,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});

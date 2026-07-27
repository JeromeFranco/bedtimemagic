import { StyleSheet, Text, type TextProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Colors, ThemeColor, Typography, TypographyPreset } from '@/theme';

export type ThemedTextProps = TextProps & {
  type?: TypographyPreset;
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'textPrimary'] },
        type === 'linkPrimary' && styles.linkPrimary,
        styles[type],
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  hero: Typography.hero,
  subtitle: Typography.subtitle,
  title: Typography.title,
  heading: Typography.heading,
  body: Typography.body,
  default: Typography.default,
  small: Typography.small,
  smallBold: Typography.smallBold,
  caption: Typography.caption,
  link: Typography.link,
  linkPrimary: {
    ...Typography.linkPrimary,
    color: Colors.dark.textPrimary,
  },
  code: Typography.code,
});


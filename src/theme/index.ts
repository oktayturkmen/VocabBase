import { colors, darkColors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

export const theme = {
  colors,
  spacing,
  typography,
} as const;

export const darkTheme = {
  colors: darkColors,
  spacing,
  typography,
} as const;

export type Theme = typeof theme;
export type ThemeMode = 'light' | 'dark';

export { colors, darkColors, spacing, typography };
export { ThemeProvider, useThemeContext, type ThemeMode as ThemeModeExport } from './ThemeProvider';
export { useTheme } from './useTheme';

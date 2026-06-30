import { useThemeContext as useThemeContextHook, type Theme } from './ThemeProvider';

export function useTheme(): Theme {
  return useThemeContextHook().theme;
}

export function useThemeContext() {
  return useThemeContextHook();
}

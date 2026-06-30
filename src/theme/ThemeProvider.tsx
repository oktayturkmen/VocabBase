import { createContext, useContext, useState, type ReactNode } from 'react';

import { getKeyValueStorage } from '@/services/storage';
import { colors, darkColors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

const theme = {
  colors,
  spacing,
  typography,
} as const;

const darkTheme = {
  colors: darkColors,
  spacing,
  typography,
} as const;

const themeStorage = getKeyValueStorage({ id: 'theme' });
const themeModeStorageKey = 'themeMode';

export type Theme = typeof theme;
export type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme,
  themeMode: 'light',
  toggleTheme: () => {},
  setThemeMode: () => {},
});

type ThemeProviderProps = {
  children: ReactNode;
};

function getInitialThemeMode(): ThemeMode {
  try {
    const savedTheme = themeStorage.getString(themeModeStorageKey) as ThemeMode | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
  } catch (error) {
    console.error('Failed to load theme from MMKV:', error);
  }

  return 'light';
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getInitialThemeMode);

  const toggleTheme = () => {
    setThemeModeState((prev) => {
      const newMode = prev === 'light' ? 'dark' : 'light';
      try {
        themeStorage.set(themeModeStorageKey, newMode);
      } catch (error) {
        console.error('Failed to save theme to MMKV:', error);
      }
      return newMode;
    });
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      themeStorage.set(themeModeStorageKey, mode);
    } catch (error) {
      console.error('Failed to save theme to MMKV:', error);
    }
  };

  const currentTheme = themeMode === 'dark' ? darkTheme : theme;

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, themeMode, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}

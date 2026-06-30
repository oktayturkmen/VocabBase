import '../../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider } from '@/theme/ThemeProvider';
import { useTheme } from '@/theme/useTheme';
import { DatabaseGate } from '@/database/DatabaseGate';

function RootNavigator() {
  const { colors } = useTheme();

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lists" options={{ headerShown: false }} />
        <Stack.Screen name="words" options={{ headerShown: false }} />
        <Stack.Screen name="quiz" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <DatabaseGate>
        <RootNavigator />
      </DatabaseGate>
    </ThemeProvider>
  );
}

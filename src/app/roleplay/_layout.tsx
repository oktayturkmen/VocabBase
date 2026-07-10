import { Stack } from 'expo-router';

import { useTheme } from '@/theme/useTheme';

/**
 * Roleplay ekranları için Stack navigator.
 * Alt tab bar bu ekranlarda gizlidir (root layout'ta ayrı route olarak tanımlı).
 */
export default function RoleplayLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}
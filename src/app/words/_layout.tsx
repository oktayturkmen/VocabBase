import { Stack } from 'expo-router';

import { useTheme } from '@/theme/useTheme';

export default function WordsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="new" options={{ title: 'Kelime Ekle' }} />
      <Stack.Screen name="[id]" options={{ title: 'Kelime Düzenle' }} />
    </Stack>
  );
}

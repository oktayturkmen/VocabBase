import { Stack } from 'expo-router';

import { useTheme } from '@/theme/useTheme';

export default function ListsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Kelime Listeleri',
          headerBackTitle: 'Geri',
        }}
      />
    </Stack>
  );
}

import { Stack } from 'expo-router';

import { useTheme } from '@/theme/useTheme';

export default function QuizLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Quiz' }} />
      <Stack.Screen
        name="multiple-choice"
        options={{ title: 'Multiple Choice Quiz', headerShown: false }}
      />
      <Stack.Screen name="typing" options={{ title: 'Typing Quiz', headerShown: false }} />
      <Stack.Screen name="matching" options={{ title: 'Matching Quiz', headerShown: false }} />
      <Stack.Screen name="result" options={{ title: 'Quiz Results', headerShown: false }} />
    </Stack>
  );
}

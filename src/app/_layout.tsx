import '../../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components';
import { QueryProvider } from '@/services/query';
import { getNotificationService } from '@/services/notification/notification.service';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { DatabaseGate } from '@/database/DatabaseGate';

// Notification handler'ı uygulama başlangıcında bir kez yapılandır.
// Constructor side-effect'inden kaçınmak için `initialize()` açıkça çağrılır.
getNotificationService().initialize();

function RootNavigator() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: '#ffffff' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lists" options={{ headerShown: false }} />
        <Stack.Screen name="words" options={{ headerShown: false }} />
        <Stack.Screen name="quiz" options={{ headerShown: false }} />
        <Stack.Screen name="roleplay" options={{ headerShown: false }} />
        <Stack.Screen name="packages" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryProvider>
          <ThemeProvider>
            <DatabaseGate>
              <RootNavigator />
            </DatabaseGate>
          </ThemeProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, Platform, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card } from '@/components';
import { FadeIn } from '@/components/animations/FadeIn';
import { getImportService } from '@/services/import';
import { runOfflineReadinessCheck, type OfflineReadinessResult } from '@/services/offline';
import { useThemeContext } from '@/theme/useTheme';
import { useAppSettingsStore } from '@/store/app-settings.store';

let Notifications: any = null;
let getNotificationService: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const notificationModule = require('@/services/notification');
  getNotificationService = notificationModule.getNotificationService;
} catch {
  console.log('Notifications not available in this environment');
}

type NotificationSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  hour: 9,
  minute: 0,
};

function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCheckingOffline, setIsCheckingOffline] = useState(false);
  const [offlineCheck, setOfflineCheck] = useState<OfflineReadinessResult | null>(null);

  const { themeMode, toggleTheme } = useThemeContext();
  const { speechSpeed, dailyGoal, setSpeechSpeed, setDailyGoal } = useAppSettingsStore();

  const requestPermission = async () => {
    const notificationService = getNotificationService();
    const granted = await notificationService.requestPermissions();
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);

    return granted;
  };

  const toggleNotifications = async (value: boolean) => {
    if (value && permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        return;
      }
    }

    setIsSaving(true);
    try {
      const notificationService = getNotificationService();

      if (value) {
        await notificationService.scheduleDailyReminder(settings.hour, settings.minute);
      } else {
        await notificationService.cancelAllNotifications();
      }

      setSettings((prev) => ({ ...prev, enabled: value }));
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      Alert.alert(
        'Bildirim Hatası',
        error instanceof Error ? error.message : 'Bildirim ayarları güncellenemedi.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updateTime = async (hour: number, minute: number) => {
    setIsSaving(true);
    try {
      const notificationService = getNotificationService();

      if (settings.enabled) {
        await notificationService.cancelAllNotifications();
        await notificationService.scheduleDailyReminder(hour, minute);
      }

      setSettings((prev) => ({ ...prev, hour, minute }));
    } catch (error) {
      console.error('Failed to update time:', error);
      Alert.alert(
        'Hatırlatıcı Hatası',
        error instanceof Error ? error.message : 'Hatırlatıcı saati güncellenemedi.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleOfflineCheck = async () => {
    setIsCheckingOffline(true);
    try {
      const result = await runOfflineReadinessCheck();
      setOfflineCheck(result);
    } finally {
      setIsCheckingOffline(false);
    }
  };

  const handleImportCSV = async () => {
    setIsImporting(true);
    try {
      const importService = getImportService();
      const result = await importService.importFromCSV();

      if (result.success) {
        Alert.alert(
          'İçe Aktarma Başarılı',
          `Başarıyla ${result.imported} kelime içe aktarıldı.`,
        );
      } else {
        Alert.alert(
          'İçe Aktarma Hatalarla Tamamlandı',
          `İçe Aktarılan: ${result.imported}\nBaşarısız: ${result.failed}\n\n${result.errors.slice(0, 3).join('\n')}`,
        );
      }
    } catch (error) {
      Alert.alert('Import Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportPDF = async () => {
    setIsImporting(true);
    try {
      const importService = getImportService();
      const result = await importService.importFromPDF();

      if (result.success) {
        Alert.alert(
          'İçe Aktarma Başarılı',
          `Başarıyla ${result.imported} kelime içe aktarıldı.`,
        );
      } else {
        Alert.alert('İçe Aktarma Başarısız', result.errors[0] || 'Bilinmeyen hata');
      }
    } catch (error) {
      Alert.alert('İçe Aktarma Başarısız', error instanceof Error ? error.message : 'Bilinmeyen hata');
    } finally {
      setIsImporting(false);
    }
  };

  const formatTime = (h: number, m: number): string => {
    const hours = h.toString().padStart(2, '0');
    const minutes = m.toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn>
          <View className="px-md pt-md pb-sm">
            <Text className="text-2xl font-bold text-foreground mb-xs">Ayarlar</Text>
            <Text className="text-base text-muted-foreground">
              Öğrenme deneyiminizi özelleştirin
            </Text>
          </View>
        </FadeIn>

        <Card className="mx-md mb-md border border-border bg-card">
          <Text className="text-lg font-bold text-foreground mb-md">Bildirimler</Text>

          <View className="flex-row justify-between items-center mb-md">
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">Günlük Hatırlatıcı</Text>
              <Text className="text-sm text-muted-foreground">
                Her gün kelimeleri tekrar etmeniz için hatırlatma alın
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={toggleNotifications}
              disabled={isSaving}
              trackColor={{ false: '#767577', true: '#3b82f6' }}
            />
          </View>

          {settings.enabled ? (
            <View className="pt-md border-t border-border">
              <Text className="text-sm font-semibold text-muted-foreground mb-sm">
                Hatırlatma Saati
              </Text>
              <View className="flex-row gap-sm">
                {[8, 9, 10, 18, 19, 20].map((hour) => (
                  <View key={hour} className="flex-1">
                    <Pressable
                      onPress={() => void updateTime(hour, 0)}
                      accessibilityRole="button"
                      accessibilityLabel={`Set reminder time to ${formatTime(hour, 0)}`}
                      accessibilityState={{
                        selected: settings.hour === hour && settings.minute === 0,
                      }}
                    >
                      <Card
                        className={`p-sm border ${
                          settings.hour === hour && settings.minute === 0
                            ? 'bg-primary border-primary'
                            : 'bg-card border-border'
                        }`}
                      >
                        <Text
                          className={`text-center text-sm font-semibold ${
                            settings.hour === hour && settings.minute === 0
                              ? 'text-primary-foreground'
                              : 'text-foreground'
                          }`}
                        >
                          {formatTime(hour, 0)}
                        </Text>
                      </Card>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {permissionStatus && permissionStatus !== 'granted' ? (
            <View className="mt-md pt-md border-t border-border">
              <Text className="text-sm text-error mb-xs">
                Bildirimler etkin değil. Günlük hatırlatıcılar almak için etkinleştirin.
              </Text>
            </View>
          ) : null}
        </Card>

        <Card className="mx-md mb-md border border-border bg-card">
          <Text className="text-lg font-bold text-foreground mb-md">Görünüm</Text>

          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">Karanlık Mod</Text>
              <Text className="text-sm text-muted-foreground">
                Açık ve koyu tema arasında geçiş yapın
              </Text>
            </View>
            <Switch
              value={themeMode === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: '#767577', true: '#3b82f6' }}
            />
          </View>
        </Card>

        <Card className="mx-md mb-md border border-border bg-card">
          <Text className="text-lg font-bold text-foreground mb-md">Konuşma</Text>

          <View className="mb-md">
            <Text className="text-sm font-semibold text-muted-foreground mb-sm">
              Konuşma Hızı: {speechSpeed.toFixed(1)}x
            </Text>
            <View className="flex-row gap-sm">
              {[0.5, 0.8, 1.0, 1.2, 1.5].map((speed) => (
                <View key={speed} className="flex-1">
                  <Pressable
                    onPress={() => setSpeechSpeed(speed)}
                    accessibilityRole="button"
                    accessibilityLabel={`Set speech speed to ${speed}x`}
                    accessibilityState={{ selected: speechSpeed === speed }}
                    className={`p-sm rounded-lg border ${
                      speechSpeed === speed ? 'bg-primary border-primary' : 'bg-card border-border'
                    }`}
                  >
                    <Text
                      className={`text-center text-sm font-semibold ${
                        speechSpeed === speed ? 'text-primary-foreground' : 'text-foreground'
                      }`}
                    >
                      {speed}x
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </Card>

        <Card className="mx-md mb-md border border-border bg-card">
          <Text className="text-lg font-bold text-foreground mb-md">Öğrenme Hedefleri</Text>

          <View className="mb-md">
            <Text className="text-sm font-semibold text-muted-foreground mb-sm">
              Günlük Kelime Hedefi: {dailyGoal} kelime
            </Text>
            <View className="flex-row gap-sm">
              {[5, 10, 15, 20, 25].map((goal) => (
                <View key={goal} className="flex-1">
                  <Pressable
                    onPress={() => setDailyGoal(goal)}
                    accessibilityRole="button"
                    accessibilityLabel={`Set daily word goal to ${goal} words`}
                    accessibilityState={{ selected: dailyGoal === goal }}
                    className={`p-sm rounded-lg border ${
                      dailyGoal === goal ? 'bg-primary border-primary' : 'bg-card border-border'
                    }`}
                  >
                    <Text
                      className={`text-center text-sm font-semibold ${
                        dailyGoal === goal ? 'text-primary-foreground' : 'text-foreground'
                      }`}
                    >
                      {goal}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </Card>

        <Card className="mx-md mb-md border border-border bg-card">
          <Text className="text-lg font-bold text-foreground mb-md">Kelime İçe Aktar</Text>
          <Text className="text-sm text-muted-foreground mb-md">
            Kelime hazinenizi hızla oluşturmak için CSV veya PDF dosyalarından kelime içe aktarın.
          </Text>
          <View className="gap-sm">
            <Button
              title="CSV'den İçe Aktar"
              onPress={handleImportCSV}
              loading={isImporting}
              variant="outline"
            />
            <Button
              title="PDF'den İçe Aktar"
              onPress={handleImportPDF}
              loading={isImporting}
              variant="outline"
            />
          </View>
        </Card>

        <Card className="mx-md mb-md border border-border bg-card">
          <Text className="text-lg font-bold text-foreground mb-md">Çevrimdışı Hazırlık</Text>
          <Text className="text-sm text-muted-foreground mb-md">
            Ağı kullanmadan yerel veritabanı ve ayarlar depolamasını doğrulayın.
          </Text>
          {offlineCheck ? (
            <View
              className={`mb-md rounded-lg border p-sm ${
                offlineCheck.status === 'passed'
                  ? 'border-success/40 bg-success/5'
                  : 'border-error/40 bg-error/5'
              }`}
              accessibilityRole="summary"
              accessibilityLabel={offlineCheck.message}
            >
              <Text
                className={`text-sm font-semibold ${
                  offlineCheck.status === 'passed' ? 'text-success' : 'text-error'
                }`}
              >
                {offlineCheck.message}
              </Text>
              <Text className="mt-xs text-xs text-muted-foreground">
                Database: {offlineCheck.databaseReady ? 'Ready' : 'Failed'} | Settings:{' '}
                {offlineCheck.settingsReady ? 'Ready' : 'Failed'}
              </Text>
            </View>
          ) : null}
          <Button
            title="Çevrimdışı Kontrolü Çalıştır"
            onPress={handleOfflineCheck}
            loading={isCheckingOffline}
            variant="outline"
          />
        </Card>

        <Card className="mx-md mb-md border border-border bg-card">
          <Text className="text-lg font-bold text-foreground mb-md">Hakkında</Text>
          <View className="space-y-sm">
            <View>
              <Text className="text-sm text-muted-foreground">Sürüm</Text>
              <Text className="text-base font-semibold text-foreground">1.0.0</Text>
            </View>
            <View>
              <Text className="text-sm text-muted-foreground">Platform</Text>
              <Text className="text-base font-semibold text-foreground">{Platform.OS}</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

export default SettingsScreen;

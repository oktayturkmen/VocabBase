import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, Platform, Pressable, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { FadeIn } from '@/components/animations/FadeIn';
import { useImportWords } from '@/hooks/useImportWords';
import { runOfflineReadinessCheck } from '@/services/offline';
import { useTheme, useThemeContext } from '@/theme/useTheme';
import { useAppSettingsStore } from '@/store/app-settings.store';
import { useWordStore } from '@/store/word.store';
import { useLearningStore } from '@/store/learning.store';
import { useQuizStore } from '@/store/quiz.store';
import { useReviewStore } from '@/store/review.store';
import { useListStore } from '@/store/list.store';
import { useStatisticStore } from '@/store/statistic.store';
import { getDatabase } from '@/database/client';
import { TABLES } from '@/database/tables';
import * as ExpoNotifications from 'expo-notifications';
import { getNotificationService } from '@/services/notification/notification.service';

// Optional dynamic guard for environments where expo-notifications is unavailable
let Notifications: typeof ExpoNotifications | null = null;
try {
  Notifications = ExpoNotifications;
} catch {
  // Notifications module is unavailable in this environment (e.g. web/Expo Go).
  // Silently degrade notification-related features instead of crashing.
  Notifications = null;
}

type SheetType = 'speechSpeed' | 'dailyGoal' | 'import' | null;

const SPEECH_SPEED_OPTIONS = [0.5, 0.8, 1.0, 1.2, 1.5];
const DAILY_GOAL_OPTIONS = [5, 10, 15, 20, 25];

function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingOffline, setIsCheckingOffline] = useState(false);
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState<Date>(new Date(2000, 0, 1, 20, 0));

  const importMutation = useImportWords();

  const { themeMode, toggleTheme } = useThemeContext();
  const { colors } = useTheme();
  const {
    speechSpeed,
    dailyGoal,
    setSpeechSpeed,
    setDailyGoal,
    notificationEnabled,
    notificationHour,
    notificationMinute,
    setNotificationEnabled,
    setNotificationTime,
  } = useAppSettingsStore();

  // Sayfa ilk açıldığında mevcut izin durumunu getir
  useEffect(() => {
    if (!Notifications) {
      return;
    }
    void Notifications.getPermissionsAsync().then((result) => {
      setPermissionStatus(result.status);
    });
  }, []);

  const requestPermission = async () => {
    const service = getNotificationService();
    const granted = await service.requestPermissions();
    if (Notifications) {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
    }

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
      const service = getNotificationService();

      if (value) {
        await service.scheduleDailyReminder(notificationHour, notificationMinute);
      } else {
        await service.cancelAllNotifications();
      }

      setNotificationEnabled(value);
    } catch (error) {
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
      const service = getNotificationService();

      if (notificationEnabled) {
        // Mevcut bildirimi temizle ve yeni saatle yeniden zamanla
        await service.cancelAllNotifications();
        await service.scheduleDailyReminder(hour, minute);
      }

      setNotificationTime(hour, minute);
    } catch (error) {
      Alert.alert(
        'Hatırlatıcı Hatası',
        error instanceof Error ? error.message : 'Hatırlatıcı saati güncellenemedi.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openTimePicker = () => {
    setTempTime(new Date(2000, 0, 1, notificationHour, notificationMinute));
    setShowTimePicker(true);
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'set' && selectedDate) {
        void updateTime(selectedDate.getHours(), selectedDate.getMinutes());
      }
    } else if (selectedDate) {
      setTempTime(selectedDate);
    }
  };

  const confirmTimePicker = () => {
    setShowTimePicker(false);
    void updateTime(tempTime.getHours(), tempTime.getMinutes());
  };

  const handleOfflineCheck = async () => {
    setIsCheckingOffline(true);
    try {
      const result = await runOfflineReadinessCheck();
      Alert.alert(
        'Çevrimdışı Kontrol',
        result.message +
          `\n\nDatabase: ${result.databaseReady ? 'Hazır' : 'Başarısız'}\nSettings: ${result.settingsReady ? 'Hazır' : 'Başarısız'}`,
      );
    } finally {
      setIsCheckingOffline(false);
    }
  };

  const handleImportCSV = () => {
    importMutation.mutate('csv', {
      onSuccess: (result) => {
        if (result.success) {
          Alert.alert('İçe Aktarma Başarılı', `Başarıyla ${result.imported} kelime içe aktarıldı.`);
        } else {
          Alert.alert(
            'İçe Aktarma Hatalarla Tamamlandı',
            `İçe Aktarılan: ${result.imported}\nBaşarısız: ${result.failed}\n\n${result.errors.slice(0, 3).join('\n')}`,
          );
        }
      },
      onError: (error) => {
        Alert.alert('İçe Aktarma Başarısız', error instanceof Error ? error.message : 'Bilinmeyen hata');
      },
    });
  };

  const handleImportPDF = () => {
    importMutation.mutate('pdf', {
      onSuccess: (result) => {
        if (result.success) {
          Alert.alert('İçe Aktarma Başarılı', `Başarıyla ${result.imported} kelime içe aktarıldı.`);
        } else {
          Alert.alert('İçe Aktarma Başarısız', result.errors[0] || 'Bilinmeyen hata');
        }
      },
      onError: (error) => {
        Alert.alert('İçe Aktarma Başarısız', error instanceof Error ? error.message : 'Bilinmeyen hata');
      },
    });
  };

  const handleFeedback = () => {
    Alert.alert(
      'Geri Bildirim',
      'Geri bildiriminiz için teşekkürler! Bu özellik yakında aktif olacak.',
    );
  };

  const handleResetProgress = () => {
    Alert.alert(
      'Tüm İlerlemeyi Sıfırla',
      'Bu işlem tüm öğrenme ilerlemenizi (tekrarlar, istatistikler) silecek. Kelimeleriniz ve listeleriniz silinmeyecek. Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, sıfırla',
          style: 'destructive',
          onPress: () => {
            void performResetProgress();
          },
        },
      ],
    );
  };

  const performResetProgress = async () => {
    setIsSaving(true);
    try {
      // 1. SQLite veritabanındaki ilerleme verilerini temizle
      const database = await getDatabase();
      await database.withTransactionAsync(async () => {
        await database.runAsync(`DELETE FROM ${TABLES.REVIEWS}`);
        await database.runAsync(`DELETE FROM ${TABLES.STATISTICS}`);
      });

      // 2. Tüm Zustand store'larını başlangıç state'ine sıfırla
      useWordStore.getState().reset();
      useLearningStore.getState().reset();
      useQuizStore.getState().resetQuiz();
      useReviewStore.getState().reset();
      useListStore.getState().reset();
      useStatisticStore.getState().reset();

      // 3. Verileri yeniden yükle (Profil ekranı dahil tüm ekranlar için)
      void useWordStore.getState().fetchWords();
      void useListStore.getState().fetchLists();
      // Profil ekranı todayStatistic ve unlearnedCount verilerini kullanır,
      // bu yüzden bu verileri de yeniden yüklemek gerekiyor.
      void useStatisticStore.getState().fetchTodayStatistic();
      void useStatisticStore.getState().fetchRecentStatistics(30);
      void useLearningStore.getState().fetchUnlearnedCount();

      Alert.alert('Başarılı', 'Tüm öğrenme ilerlemeniz sıfırlandı.');
    } catch (error) {
      Alert.alert(
        'Hata',
        error instanceof Error ? error.message : 'İlerleme sıfırlanamadı.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (h: number, m: number): string => {
    const hours = h.toString().padStart(2, '0');
    const minutes = m.toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleSheetSelect = (type: SheetType, value: number) => {
    if (type === 'speechSpeed') {
      setSpeechSpeed(value);
    } else if (type === 'dailyGoal') {
      setDailyGoal(value);
    }
    setActiveSheet(null);
  };

  const sheetTitle =
    activeSheet === 'speechSpeed'
      ? 'Konuşma Hızı'
      : activeSheet === 'dailyGoal'
        ? 'Günlük Kelime Hedefi'
        : activeSheet === 'import'
          ? 'Kelime İçe Aktar'
          : '';

  const sheetOptions =
    activeSheet === 'speechSpeed'
      ? SPEECH_SPEED_OPTIONS
      : activeSheet === 'dailyGoal'
        ? DAILY_GOAL_OPTIONS
        : [];

  const sheetCurrentValue =
    activeSheet === 'speechSpeed'
      ? speechSpeed
      : activeSheet === 'dailyGoal'
        ? dailyGoal
        : null;

  const sheetFormatValue = (value: number): string => {
    if (activeSheet === 'speechSpeed') return `${value.toFixed(1)}x`;
    if (activeSheet === 'dailyGoal') return `${value} kelime`;
    return '';
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn>
          <View className="px-md pb-lg">
            <Text className="text-2xl font-bold text-foreground mb-sm">Ayarlar</Text>
            <Text className="text-base text-muted-foreground">
              Öğrenme deneyiminizi özelleştirin
            </Text>
          </View>
        </FadeIn>

        {/* Tercihler Bölümü */}
        <View className="px-md mb-lg">
          <Text className="text-xs font-semibold uppercase text-muted-foreground mb-sm px-xs">
            Tercihler
          </Text>
          <View className="rounded-2xl border border-slate-100 border-border bg-card shadow-sm overflow-hidden">
            {/* Günlük Bildirim */}
            <View className="flex-row items-center justify-between px-md py-md border-b border-border">
              <View className="flex-1 pr-md">
                <Text className="text-base font-medium text-foreground">Günlük Bildirim</Text>
                <Text className="text-sm text-muted-foreground mt-xs">
                  Her gün kelimeleri tekrar etmeniz için hatırlatma alın
                </Text>
              </View>
              <Switch
                value={notificationEnabled}
                onValueChange={toggleNotifications}
                disabled={isSaving}
                trackColor={{ false: colors.muted, true: colors.primary }}
              />
            </View>

            {/* Hatırlatma Saati */}
            {notificationEnabled ? (
              <Pressable
                onPress={openTimePicker}
                accessibilityRole="button"
                accessibilityLabel="Hatırlatma saati seç"
                className="flex-row items-center justify-between px-md py-md border-b border-border active:opacity-60"
              >
                <Text className="text-base font-medium text-foreground">Hatırlatma Saati</Text>
                <View className="flex-row items-center">
                  <Text className="text-sm text-muted-foreground mr-sm">
                    {formatTime(notificationHour, notificationMinute)}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                </View>
              </Pressable>
            ) : null}

            {/* Karanlık Mod */}
            <View className="flex-row items-center justify-between px-md py-md border-b border-border">
              <View className="flex-1 pr-md">
                <Text className="text-base font-medium text-foreground">Karanlık Mod</Text>
                <Text className="text-sm text-muted-foreground mt-xs">
                  Açık ve koyu tema arasında geçiş yapın
                </Text>
              </View>
              <Switch
                value={themeMode === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.muted, true: colors.primary }}
              />
            </View>

            {/* Konuşma Hızı */}
            <Pressable
              onPress={() => setActiveSheet('speechSpeed')}
              accessibilityRole="button"
              accessibilityLabel="Konuşma hızı seç"
              className="flex-row items-center justify-between px-md py-md border-b border-border active:opacity-60"
            >
              <Text className="text-base font-medium text-foreground">Konuşma Hızı</Text>
              <View className="flex-row items-center">
                <Text className="text-sm text-muted-foreground mr-sm">
                  {speechSpeed.toFixed(1)}x
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
              </View>
            </Pressable>

            {/* Öğrenme Hedefleri */}
            <Pressable
              onPress={() => setActiveSheet('dailyGoal')}
              accessibilityRole="button"
              accessibilityLabel="Günlük kelime hedefi seç"
              className="flex-row items-center justify-between px-md py-md active:opacity-60"
            >
              <Text className="text-base font-medium text-foreground">Öğrenme Hedefleri</Text>
              <View className="flex-row items-center">
                <Text className="text-sm text-muted-foreground mr-sm">
                  {dailyGoal} kelime
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Destek Bölümü */}
        <View className="px-md mb-lg">
          <Text className="text-xs font-semibold uppercase text-muted-foreground mb-sm px-xs">
            Destek
          </Text>
          <View className="rounded-2xl border border-slate-100 border-border bg-card shadow-sm overflow-hidden">
            {/* Kelime İçe Aktar */}
            <Pressable
              onPress={() => setActiveSheet('import')}
              accessibilityRole="button"
              accessibilityLabel="Kelime içe aktar"
              className="flex-row items-center justify-between px-md py-md border-b border-border active:opacity-60"
            >
              <Text className="text-base font-medium text-foreground">Kelime İçe Aktar</Text>
              <View className="flex-row items-center">
                {importMutation.isPending ? (
                  <Text className="text-sm text-muted-foreground mr-sm">İçe aktarılıyor...</Text>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
              </View>
            </Pressable>

            {/* Çevrimdışı Kontrolü */}
            <Pressable
              onPress={handleOfflineCheck}
              accessibilityRole="button"
              accessibilityLabel="Çevrimdışı kontrolü çalıştır"
              disabled={isCheckingOffline}
              className="flex-row items-center justify-between px-md py-md border-b border-border active:opacity-60"
            >
              <Text className="text-base font-medium text-foreground">Çevrimdışı Kontrolü</Text>
              <View className="flex-row items-center">
                {isCheckingOffline ? (
                  <Text className="text-sm text-muted-foreground mr-sm">Kontrol ediliyor...</Text>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
              </View>
            </Pressable>

            {/* Geri Bildirim Gönder */}
            <Pressable
              onPress={handleFeedback}
              accessibilityRole="button"
              accessibilityLabel="Geri bildirim gönder"
              className="flex-row items-center justify-between px-md py-md active:opacity-60"
            >
              <Text className="text-base font-medium text-sky-500">Geri Bildirim Gönder</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* Hesap veya Veri Bölümü */}
        <View className="px-md mb-lg">
          <Text className="text-xs font-semibold uppercase text-muted-foreground mb-sm px-xs">
            Hesap veya Veri
          </Text>
          <View className="rounded-2xl border border-slate-100 border-border bg-card shadow-sm overflow-hidden">
            {/* Tüm İlerlemeyi Sıfırla */}
            <Pressable
              onPress={handleResetProgress}
              accessibilityRole="button"
              accessibilityLabel="Tüm ilerlemeyi sıfırla"
              className="flex-row items-center justify-between px-md py-md active:opacity-60"
            >
              <Text className="text-base font-medium text-red-500">Tüm İlerlemeyi Sıfırla</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* Versiyon Bilgisi */}
        <View className="items-center px-md">
          <Text className="text-xs text-muted-foreground">
            VocabBase • Sürüm 1.0.0 • {Platform.OS}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Sheet Modal */}
      <Modal
        visible={activeSheet !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveSheet(null)}
      >
        <Pressable className="flex-1 bg-black/40" onPress={() => setActiveSheet(null)}>
          <Pressable
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-card"
            style={{ paddingBottom: insets.bottom + 16 }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Grab handle */}
            <View className="self-center w-10 h-1 rounded-full bg-muted-foreground/30 mt-sm mb-md" />

            {/* Title */}
            <Text className="text-lg font-bold text-foreground px-md pb-md">{sheetTitle}</Text>

            {/* Options */}
            {activeSheet === 'import' ? (
              <View>
                <Pressable
                  onPress={() => {
                    handleImportCSV();
                    setActiveSheet(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="CSV dosyası yükle"
                  className="flex-row items-center px-md py-md border-t border-border active:opacity-60"
                >
                  <Ionicons name="document-text-outline" size={22} color={colors.mutedForeground} />
                  <Text className="text-base text-foreground ml-md">CSV Dosyası Yükle</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    handleImportPDF();
                    setActiveSheet(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="PDF dosyası yükle"
                  className="flex-row items-center px-md py-md border-t border-border active:opacity-60"
                >
                  <Ionicons name="document-text-outline" size={22} color={colors.mutedForeground} />
                  <Text className="text-base text-foreground ml-md">PDF Dosyası Yükle</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {sheetOptions.map((option) => {
                  const isSelected = option === sheetCurrentValue;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => handleSheetSelect(activeSheet, option)}
                      accessibilityRole="button"
                      accessibilityLabel={`${sheetFormatValue(option)} seç`}
                      accessibilityState={{ selected: isSelected }}
                      className="flex-row items-center justify-between px-md py-md border-t border-border active:opacity-60"
                    >
                      <Text
                        className={`text-base ${isSelected ? 'font-semibold text-primary' : 'text-foreground'}`}
                      >
                        {sheetFormatValue(option)}
                      </Text>
                      {isSelected ? (
                        <Ionicons name="checkmark" size={22} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Android: DateTimePicker native dialog */}
      {showTimePicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={tempTime}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      ) : null}

      {/* iOS: DateTimePicker bottom sheet */}
      <Modal
        visible={showTimePicker && Platform.OS === 'ios'}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <Pressable className="flex-1 bg-black/40" onPress={() => setShowTimePicker(false)}>
          <Pressable
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-card"
            style={{ paddingBottom: insets.bottom + 16 }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="self-center w-10 h-1 rounded-full bg-muted-foreground/30 mt-sm mb-md" />
            <View className="flex-row items-center justify-between px-md pb-md">
              <Pressable onPress={() => setShowTimePicker(false)} hitSlop={8}>
                <Text className="text-base text-muted-foreground">İptal</Text>
              </Pressable>
              <Text className="text-lg font-bold text-foreground">Hatırlatma Saati</Text>
              <Pressable onPress={confirmTimePicker} hitSlop={8}>
                <Text className="text-base text-primary font-semibold">Tamam</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={tempTime}
              mode="time"
              display="spinner"
              onChange={handleTimeChange}
              style={{ height: 200 }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default SettingsScreen;
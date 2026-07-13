import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, Platform, Pressable, Alert, Modal, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';

import { FadeIn } from '@/components/animations/FadeIn';
import { useImportWords } from '@/hooks/useImportWords';
import { useBackupRestore } from '@/hooks/useBackupRestore';
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

function parseTime(timeString: string): { hour: number; minute: number } {
  const time = timeString || '20:00';
  const parts = time.split(':');
  
  if (parts.length !== 2) {
    return { hour: 20, minute: 0 };
  }
  
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  
  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { hour: 20, minute: 0 };
  }
  
  return { hour, minute };
}

type SettingRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  isLast?: boolean;
  danger?: boolean;
};

function SettingRow({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  rightElement,
  onPress,
  disabled,
  isLast,
  danger,
}: SettingRowProps) {
  const { colors } = useTheme();

  const content = (
    <View className="flex-row items-center px-md py-3">
      {/* Icon Container */}
      <View className={`mr-md h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      
      {/* Text Info */}
      <View className="flex-1 pr-md">
        <Text className={`text-[15px] font-semibold ${danger ? 'text-red-500' : 'text-foreground'}`}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-[11px] text-muted-foreground mt-0.5 leading-normal" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right Element & Optional Chevron */}
      <View className="flex-row items-center">
        {rightElement}
        {onPress && !danger && (
          <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} className="ml-xs" />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        className={`active:opacity-60 ${isLast ? '' : 'border-b border-border'}`}
      >
        {content}
      </Pressable>
    );
  }

  return <View className={isLast ? '' : 'border-b border-border'}>{content}</View>;
}

type SectionHeaderProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function SectionHeader({ title, icon }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center gap-2 mb-sm px-xs mt-sm">
      <Ionicons name={icon} size={14} color="#94a3b8" />
      <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </Text>
    </View>
  );
}

function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingOffline, setIsCheckingOffline] = useState(false);
  const [isBackupRestoring, setIsBackupRestoring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState<Date>(new Date(2000, 0, 1, 20, 0));

  const importMutation = useImportWords();
  const { exportBackup, importBackup } = useBackupRestore();

  const { themeMode, toggleTheme } = useThemeContext();
  const { colors } = useTheme();
  const {
    speechSpeed,
    dailyGoal,
    setSpeechSpeed,
    setDailyGoal,
    notificationEnabled,
    notificationTime,
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
    const previousValue = notificationEnabled;
    
    if (value && permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        return;
      }
    }

    setIsSaving(true);
    try {
      const service = getNotificationService();
      const { hour, minute } = parseTime(notificationTime);

      if (value) {
        await service.scheduleDailyReminder(hour, minute);
      } else {
        await service.cancelAllNotifications();
      }

      setNotificationEnabled(value);
    } catch (error) {
      // Rollback to previous state on error
      setNotificationEnabled(previousValue);
      Alert.alert(
        'Bildirim Hatası',
        error instanceof Error ? error.message : 'Bildirim ayarları güncellenemedi.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updateTime = async (hour: number, minute: number) => {
    const previousTime = notificationTime;
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
      // Rollback to previous time on error
      const { hour: prevHour, minute: prevMinute } = parseTime(previousTime);
      setNotificationTime(prevHour, prevMinute);
      Alert.alert(
        'Hatırlatıcı Hatası',
        error instanceof Error ? error.message : 'Hatırlatıcı saati güncellenemedi.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openTimePicker = () => {
    const { hour, minute } = parseTime(notificationTime);
    setTempTime(new Date(2000, 0, 1, hour, minute));
    setShowTimePicker(true);
  };

  // Android: Kullanıcı saat seçtiğinde (OK butonuna bastığında) tetiklenir
  const handleAndroidTimeChange = (_event: DateTimePickerChangeEvent, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (!selectedDate) {
      return;
    }
    const hours = selectedDate.getHours();
    const minutes = selectedDate.getMinutes();
    void updateTime(hours, minutes);
  };

  // Android: Kullanıcı picker'ı iptal ettiğinde tetiklenir
  const handleAndroidTimeDismiss = () => {
    setShowTimePicker(false);
  };

  // iOS: Spinner'da kullanıcı kaydırma yaptıkça tetiklenir (canlı güncelleme)
  const handleIOSTimeChange = (_event: DateTimePickerChangeEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setTempTime(selectedDate);
    }
  };

  const confirmTimePicker = () => {
    setShowTimePicker(false);
    // Use local time methods to get the actual selected time
    const hours = tempTime.getHours();
    const minutes = tempTime.getMinutes();
    void updateTime(hours, minutes);
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

  const refreshImportedWordData = () => {
    void useWordStore.getState().fetchWords();
    void useListStore.getState().fetchLists();
    void useLearningStore.getState().fetchUnlearnedCount();
    void useLearningStore.getState().fetchTotalWordCount();
  };

  const handleImportCSV = () => {
    importMutation.mutate('csv', {
      onSuccess: (result) => {
        if (result.imported > 0) {
          refreshImportedWordData();
        }

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
        if (result.imported > 0) {
          refreshImportedWordData();
        }

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
      void useLearningStore.getState().fetchTotalWordCount();

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

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      await exportBackup();
      Alert.alert('Başarılı', 'Yedek dosyası oluşturuldu ve paylaşıldı.');
    } catch (error) {
      Alert.alert(
        'Yedek Hatası',
        error instanceof Error ? error.message : 'Yedek oluşturulamadı.',
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async () => {
    Alert.alert(
      'Yedek Geri Yükle',
      'Bu işlem mevcut verilerinizin üzerine yazacak. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, yükle',
          style: 'destructive',
          onPress: async () => {
            setIsBackupRestoring(true);
            try {
              await importBackup();
              // Tüm store'ları yenile
              void useWordStore.getState().fetchWords();
              void useListStore.getState().fetchLists();
              void useReviewStore.getState().fetchDueReviews();
              void useStatisticStore.getState().fetchTodayStatistic();
              void useStatisticStore.getState().fetchRecentStatistics(30);
              void useLearningStore.getState().fetchUnlearnedCount();
              void useLearningStore.getState().fetchTotalWordCount();
              Alert.alert('Başarılı', 'Yedek başarıyla geri yüklendi.');
            } catch (error) {
              Alert.alert(
                'Yedek Yükleme Hatası',
                error instanceof Error ? error.message : 'Yedek yüklenemedi.',
              );
            } finally {
              setIsBackupRestoring(false);
            }
          },
        },
      ],
    );
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
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 42 }}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn>
          <View className="px-md pb-md pt-sm">
            <Text className="text-3xl font-bold text-foreground">Ayarlar</Text>
            <Text className="text-sm text-muted-foreground mt-xs">
              Öğrenme deneyiminizi dilediğiniz gibi özelleştirin.
            </Text>
          </View>
        </FadeIn>

        {/* Tercihler Bölümü */}
        <View className="px-md mb-lg">
          <SectionHeader title="Tercihler" icon="options-outline" />
          <View className="rounded-2xl border border-border bg-card overflow-hidden">
            <SettingRow
              icon="notifications-outline"
              iconColor="#f43f5e"
              iconBg="bg-rose-50 dark:bg-rose-950/20"
              title="Günlük Bildirim"
              subtitle="Her gün kelimeleri tekrar etmeniz için hatırlatma alın"
              rightElement={
                <Switch
                  value={notificationEnabled}
                  onValueChange={toggleNotifications}
                  disabled={isSaving}
                  trackColor={{ false: colors.muted, true: colors.primary }}
                />
              }
            />

            {notificationEnabled && (
              <SettingRow
                icon="time-outline"
                iconColor="#3b82f6"
                iconBg="bg-blue-50 dark:bg-blue-950/20"
                title="Hatırlatma Saati"
                subtitle="Bildirimin gönderileceği zamanı belirleyin"
                rightElement={
                  <Text className="text-sm text-muted-foreground">{notificationTime}</Text>
                }
                onPress={openTimePicker}
              />
            )}

            <SettingRow
              icon="moon-outline"
              iconColor="#d97706"
              iconBg="bg-amber-50 dark:bg-amber-950/20"
              title="Karanlık Mod"
              subtitle="Açık ve koyu tema arasında geçiş yapın"
              rightElement={
                <Switch
                  value={themeMode === 'dark'}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.muted, true: colors.primary }}
                />
              }
            />

            <SettingRow
              icon="speedometer-outline"
              iconColor="#6366f1"
              iconBg="bg-indigo-50 dark:bg-indigo-950/20"
              title="Konuşma Hızı"
              subtitle="Kelimelerin seslendirilme temposunu ayarlayın"
              rightElement={
                <Text className="text-sm text-muted-foreground">{speechSpeed.toFixed(1)}x</Text>
              }
              onPress={() => setActiveSheet('speechSpeed')}
            />

            <SettingRow
              icon="flag-outline"
              iconColor="#10b981"
              iconBg="bg-emerald-50 dark:bg-emerald-950/20"
              title="Öğrenme Hedefleri"
              subtitle="Günlük hedef kelime miktarını belirleyin"
              rightElement={
                <Text className="text-sm text-muted-foreground">{dailyGoal} kelime</Text>
              }
              onPress={() => setActiveSheet('dailyGoal')}
              isLast={true}
            />
          </View>
        </View>

        {/* Destek Bölümü */}
        <View className="px-md mb-lg">
          <SectionHeader title="Destek" icon="help-circle-outline" />
          <View className="rounded-2xl border border-border bg-card overflow-hidden">
            <SettingRow
              icon="download-outline"
              iconColor="#8b5cf6"
              iconBg="bg-violet-50 dark:bg-violet-950/20"
              title="Kelime İçe Aktar"
              subtitle="Cihazınızdaki PDF veya CSV dosyalarından kelimeleri yükleyin"
              rightElement={
                importMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.primary} className="mr-xs" />
                ) : null
              }
              onPress={() => setActiveSheet('import')}
            />

            <SettingRow
              icon="wifi-outline"
              iconColor="#ea580c"
              iconBg="bg-orange-50 dark:bg-orange-950/20"
              title="Çevrimdışı Kontrolü"
              subtitle="Cihazın internet bağlantı durumunu ve servisleri test edin"
              rightElement={
                isCheckingOffline ? (
                  <ActivityIndicator size="small" color={colors.primary} className="mr-xs" />
                ) : null
              }
              onPress={handleOfflineCheck}
            />

            <SettingRow
              icon="chatbubble-outline"
              iconColor="#db2777"
              iconBg="bg-pink-50 dark:bg-pink-950/20"
              title="Geri Bildirim Gönder"
              subtitle="Uygulamayı geliştirmemiz için görüş ve önerilerinizi paylaşın"
              onPress={handleFeedback}
              isLast={true}
            />
          </View>
        </View>

        {/* Hesap veya Veri Bölümü */}
        <View className="px-md mb-lg">
          <SectionHeader title="Hesap veya Veri" icon="server-outline" />
          <View className="rounded-2xl border border-border bg-card overflow-hidden">
            <SettingRow
              icon="cloud-upload-outline"
              iconColor="#0ea5e9"
              iconBg="bg-sky-50 dark:bg-sky-950/20"
              title="Yedek Dışa Aktar"
              subtitle="Kütüphanenizi ve tüm ilerlemenizi dosya olarak yedekleyin"
              rightElement={
                isExporting ? (
                  <ActivityIndicator size="small" color={colors.primary} className="mr-xs" />
                ) : null
              }
              onPress={handleExportBackup}
            />

            <SettingRow
              icon="cloud-download-outline"
              iconColor="#14b8a6"
              iconBg="bg-teal-50 dark:bg-teal-950/20"
              title="Yedek Geri Yükle"
              subtitle="Daha önce aldığınız yedek dosyasını uygulamaya yükleyin"
              rightElement={
                isBackupRestoring ? (
                  <ActivityIndicator size="small" color={colors.primary} className="mr-xs" />
                ) : null
              }
              onPress={handleImportBackup}
            />

            <SettingRow
              icon="trash-outline"
              iconColor="#ef4444"
              iconBg="bg-red-50 dark:bg-red-950/20"
              title="Tüm İlerlemeyi Sıfırla"
              subtitle="Kelimelerinizi, quiz skorlarınızı ve tüm çalışma verilerinizi kalıcı olarak silin"
              onPress={handleResetProgress}
              danger={true}
              isLast={true}
            />
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
          onValueChange={handleAndroidTimeChange}
          onDismiss={handleAndroidTimeDismiss}
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
              onValueChange={handleIOSTimeChange}
              style={{ height: 200 }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default SettingsScreen;

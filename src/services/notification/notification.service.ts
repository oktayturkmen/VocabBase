import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export class NotificationService {
  private isInitialized = false;

  /**
   * Notification handler'ı yapılandırır. Constructor side-effect'i
   * önlemek için bu metodu uygulama başlangıcında açıkça çağırın.
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    this.isInitialized = true;
  }

  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily-reminder', {
        name: 'Günlük Hatırlatma',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  }

  async scheduleDailyReminder(hour: number, minute: number): Promise<string> {
    const hasPermission = await this.requestPermissions();

    if (!hasPermission) {
      throw new Error('Bildirim izinleri verilmedi');
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Tekrar Zamanı! 🧠',
        body: 'Bugün tekrar etmeniz gereken kelimeler var. Hafızanızı güçlü tutun!',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    return identifier;
  }

  /**
   * Belirli bir zamanlanmış bildirimi identifier ile iptal eder.
   * `scheduleDailyReminder` tarafından döndürülen identifier kullanılmalıdır.
   */
  async cancelDailyReminder(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  }
}

let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}

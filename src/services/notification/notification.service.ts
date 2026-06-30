import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export class NotificationService {
  constructor() {
    this.configure();
  }

  private configure(): void {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
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
        name: 'Daily Reminder',
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
      throw new Error('Notification permissions not granted');
    }

    const trigger = new Date();
    trigger.setHours(hour, minute, 0, 0);

    if (trigger <= new Date()) {
      trigger.setDate(trigger.getDate() + 1);
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to Review! 🧠',
        body: 'You have words due for review today. Keep your memory strong!',
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

  async cancelDailyReminder(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  }

  async addBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(1);
  }

  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }
}

let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}

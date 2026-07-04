import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

import { getKeyValueStorage } from '@/services/storage';

type AppSettings = {
  speechSpeed: number;
  dailyGoal: number;
  notificationEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
};

export type AppSettingsStore = AppSettings & {
  setSpeechSpeed: (speed: number) => void;
  setDailyGoal: (goal: number) => void;
  setNotificationEnabled: (enabled: boolean) => void;
  setNotificationTime: (hour: number, minute: number) => void;
};

const DEFAULT_SETTINGS: AppSettings = {
  speechSpeed: 0.8,
  dailyGoal: 10,
  notificationEnabled: false,
  notificationHour: 20,
  notificationMinute: 0,
};

const settingsStorage = getKeyValueStorage({ id: 'app-settings' });

const zustandStorage: StateStorage = {
  getItem: (name) => settingsStorage.getString(name) ?? null,
  setItem: (name, value) => settingsStorage.set(name, value),
  removeItem: (name) => settingsStorage.remove(name),
};

export const useAppSettingsStore = create<AppSettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setSpeechSpeed: (speed) => set({ speechSpeed: speed }),
      setDailyGoal: (goal) => set({ dailyGoal: goal }),
      setNotificationEnabled: (enabled) => set({ notificationEnabled: enabled }),
      setNotificationTime: (hour, minute) =>
        set({ notificationHour: hour, notificationMinute: minute }),
    }),
    {
      name: 'app-settings-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        speechSpeed: state.speechSpeed,
        dailyGoal: state.dailyGoal,
        notificationEnabled: state.notificationEnabled,
        notificationHour: state.notificationHour,
        notificationMinute: state.notificationMinute,
      }),
    },
  ),
);
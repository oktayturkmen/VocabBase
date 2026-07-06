import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

import { getKeyValueStorage } from '@/services/storage';

type AppSettings = {
  speechSpeed: number;
  dailyGoal: number;
  notificationEnabled: boolean;
  notificationTime: string;
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
  notificationTime: '20:00',
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
        set({ notificationTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}` }),
    }),
    {
      name: 'app-settings-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        speechSpeed: state.speechSpeed,
        dailyGoal: state.dailyGoal,
        notificationEnabled: state.notificationEnabled,
        notificationTime: state.notificationTime,
      }),
    },
  ),
);
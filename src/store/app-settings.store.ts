import { create } from 'zustand';

type AppSettings = {
  speechSpeed: number;
  dailyGoal: number;
};

type AppSettingsStore = AppSettings & {
  setSpeechSpeed: (speed: number) => void;
  setDailyGoal: (goal: number) => void;
};

const DEFAULT_SETTINGS: AppSettings = {
  speechSpeed: 0.8,
  dailyGoal: 10,
};

export const useAppSettingsStore = create<AppSettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,

  setSpeechSpeed: (speed) => set({ speechSpeed: speed }),
  setDailyGoal: (goal) => set({ dailyGoal: goal }),
}));

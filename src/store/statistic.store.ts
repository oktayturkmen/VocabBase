import { create } from 'zustand';

import { getStatisticService } from '@/services/statistic/statistic.service';
import type { StatisticRow } from '@/types/statistic';

type StatisticStoreState = {
  todayStatistic: StatisticRow | null;
  recentStatistics: StatisticRow[];
  totalStatistics: {
    totalWordsLearned: number;
    totalWordsReviewed: number;
    totalQuizCorrect: number;
    totalQuizIncorrect: number;
    totalTimeSpentSeconds: number;
  } | null;
  isLoading: boolean;
  error: string | null;
};

type StatisticStoreActions = {
  fetchTodayStatistic: () => Promise<void>;
  fetchRecentStatistics: (days?: number) => Promise<void>;
  fetchTotalStatistics: () => Promise<void>;
  incrementWordsLearned: (date: string) => Promise<void>;
  incrementWordsReviewed: (date: string) => Promise<void>;
  incrementQuizCorrect: (date: string) => Promise<void>;
  incrementQuizIncorrect: (date: string) => Promise<void>;
  addTimeSpent: (date: string, seconds: number) => Promise<void>;
  reset: () => void;
};

export type StatisticStore = StatisticStoreState & StatisticStoreActions;

const initialState: StatisticStoreState = {
  todayStatistic: null,
  recentStatistics: [],
  totalStatistics: null,
  isLoading: false,
  error: null,
};

const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export const useStatisticStore = create<StatisticStore>((set, get) => ({
  ...initialState,

  fetchTodayStatistic: async () => {
    set({ isLoading: true, error: null });
    try {
      const service = await getStatisticService();
      const today = getTodayDateString();
      const todayStatistic = await service.getByDate(today);

      set({
        todayStatistic,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load today statistic',
      });
    }
  },

  fetchRecentStatistics: async (days = 7) => {
    set({ isLoading: true, error: null });
    try {
      const service = await getStatisticService();
      const recentStatistics = await service.getRecent(days);

      set({
        recentStatistics,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load recent statistics',
      });
    }
  },

  fetchTotalStatistics: async () => {
    set({ isLoading: true, error: null });
    try {
      const service = await getStatisticService();
      const totalStatistics = await service.getTotal();

      set({
        totalStatistics,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load total statistics',
      });
    }
  },

  incrementWordsLearned: async (date: string) => {
    try {
      const service = await getStatisticService();
      const updated = await service.incrementWordsLearned(date);

      set((state) => ({
        todayStatistic: date === getTodayDateString() ? updated : state.todayStatistic,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to increment words learned',
      });
    }
  },

  incrementWordsReviewed: async (date: string) => {
    try {
      const service = await getStatisticService();
      const updated = await service.incrementWordsReviewed(date);

      set((state) => ({
        todayStatistic: date === getTodayDateString() ? updated : state.todayStatistic,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to increment words reviewed',
      });
    }
  },

  incrementQuizCorrect: async (date: string) => {
    try {
      const service = await getStatisticService();
      const updated = await service.incrementQuizCorrect(date);

      set((state) => ({
        todayStatistic: date === getTodayDateString() ? updated : state.todayStatistic,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to increment quiz correct',
      });
    }
  },

  incrementQuizIncorrect: async (date: string) => {
    try {
      const service = await getStatisticService();
      const updated = await service.incrementQuizIncorrect(date);

      set((state) => ({
        todayStatistic: date === getTodayDateString() ? updated : state.todayStatistic,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to increment quiz incorrect',
      });
    }
  },

  addTimeSpent: async (date: string, seconds: number) => {
    try {
      const service = await getStatisticService();
      const updated = await service.addTimeSpent(date, seconds);

      set((state) => ({
        todayStatistic: date === getTodayDateString() ? updated : state.todayStatistic,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add time spent',
      });
    }
  },

  reset: () => {
    set(initialState);
  },
}));

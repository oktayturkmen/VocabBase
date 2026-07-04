import { create } from 'zustand';

import { getLearningService } from '@/services/learning';
import { useStatisticStore } from '@/store/statistic.store';
import { logger } from '@/utils/logger';
import type { Word } from '@/types/word';

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

type LearningStoreState = {
  sessionWords: Word[];
  currentIndex: number;
  isFlipped: boolean; // false: front (word), true: back (meaning + example)
  status: 'idle' | 'loading' | 'active' | 'completed';
  unlearnedCount: number;
  isLoading: boolean;
  error: string | null;
  isPracticeSession: boolean; // true for random/list practice, false for learning new words
  sessionStartTime: number | null;
};

type LearningStoreActions = {
  fetchUnlearnedCount: (listId?: number) => Promise<void>;
  startSession: (limit?: number, listId?: number) => Promise<void>;
  startRandomSession: (limit?: number, listId?: number) => Promise<void>;
  startSessionWithAllListWords: (listId: number) => Promise<void>;
  flipCard: () => void;
  unflipCard: () => void;
  markLearned: () => Promise<void>;
  finishSession: () => void;
  reset: () => void;
  _moveToNextWord: (wordId: number) => Promise<void>;
  _moveToNextWordWithoutMarking: () => void;
};

export type LearningStore = LearningStoreState & LearningStoreActions;

const initialState: LearningStoreState = {
  sessionWords: [],
  currentIndex: 0,
  isFlipped: false,
  status: 'idle',
  unlearnedCount: 0,
  isLoading: false,
  error: null,
  isPracticeSession: false,
  sessionStartTime: null,
};

export const useLearningStore = create<LearningStore>((set, get) => ({
  ...initialState,

  fetchUnlearnedCount: async (listId?: number) => {
    try {
      const service = await getLearningService();
      const count = await service.getUnlearnedCount(listId);
      set({ unlearnedCount: count });
    } catch (error) {
      logger.error('LearningStore', 'Öğrenilmemiş kelime sayısı alınamadı', error);
    }
  },

  startSession: async (limit = 10, listId?: number) => {
    set({ isLoading: true, error: null, status: 'loading', isPracticeSession: false });
    try {
      const service = await getLearningService();
      const sessionWords = await service.getUnlearnedWords(limit, listId);

      if (sessionWords.length === 0) {
        set({
          sessionWords: [],
          currentIndex: 0,
          isFlipped: false,
          status: 'idle',
          isLoading: false,
          sessionStartTime: null,
        });
        return;
      }

      set({
        sessionWords,
        currentIndex: 0,
        isFlipped: false,
        status: 'active',
        isLoading: false,
        sessionStartTime: Date.now(),
      });
    } catch (error) {
      set({
        isLoading: false,
        status: 'idle',
        error: error instanceof Error ? error.message : 'Öğrenme oturumu başlatılamadı',
        sessionStartTime: null,
      });
    }
  },

  startRandomSession: async (limit = 5, listId?: number) => {
    set({ isLoading: true, error: null, status: 'loading', isPracticeSession: true });
    try {
      const service = await getLearningService();
      const sessionWords = await service.getRandomWords(limit, listId);

      if (sessionWords.length === 0) {
        set({
          sessionWords: [],
          currentIndex: 0,
          isFlipped: false,
          status: 'idle',
          isLoading: false,
          sessionStartTime: null,
        });
        return;
      }

      set({
        sessionWords,
        currentIndex: 0,
        isFlipped: false,
        status: 'active',
        isLoading: false,
        sessionStartTime: Date.now(),
      });
    } catch (error) {
      set({
        isLoading: false,
        status: 'idle',
        error: error instanceof Error ? error.message : 'Rastgele öğrenme oturumu başlatılamadı',
        sessionStartTime: null,
      });
    }
  },

  startSessionWithAllListWords: async (listId: number) => {
    set({ isLoading: true, error: null, status: 'loading', isPracticeSession: true });
    try {
      const service = await getLearningService();
      const sessionWords = await service.getAllWordsFromList(listId);

      if (sessionWords.length === 0) {
        set({
          sessionWords: [],
          currentIndex: 0,
          isFlipped: false,
          status: 'idle',
          isLoading: false,
          sessionStartTime: null,
        });
        return;
      }

      set({
        sessionWords,
        currentIndex: 0,
        isFlipped: false,
        status: 'active',
        isLoading: false,
        sessionStartTime: Date.now(),
      });
    } catch (error) {
      set({
        isLoading: false,
        status: 'idle',
        error: error instanceof Error ? error.message : 'Liste kelimeleriyle öğrenme oturumu başlatılamadı',
        sessionStartTime: null,
      });
    }
  },

  flipCard: () => {
    set({ isFlipped: true });
  },

  unflipCard: () => {
    set({ isFlipped: false });
  },

  markLearned: async () => {
    const { sessionWords, currentIndex, isPracticeSession } = get();
    if (currentIndex >= sessionWords.length) {
      return;
    }

    const currentWord = sessionWords[currentIndex];

    if (isPracticeSession) {
      get()._moveToNextWordWithoutMarking();
    } else {
      await get()._moveToNextWord(currentWord.id);
    }
  },

  _moveToNextWord: async (wordId: number) => {
    const { sessionWords, currentIndex, sessionStartTime } = get();
    set({ isLoading: true });

    try {
      const service = await getLearningService();
      await service.markAsLearned(wordId);

      // İstatistik kaydı
      const today = getTodayDateString();
      void useStatisticStore.getState().incrementWordsLearned(today);

      const nextIndex = currentIndex + 1;
      if (nextIndex >= sessionWords.length) {
        // Session complete - record time spent
        if (sessionStartTime) {
          const timeSpentSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
          void useStatisticStore.getState().addTimeSpent(today, timeSpentSeconds);
        }

        // Refresh unlearned count in background
        void get().fetchUnlearnedCount();
        set({
          currentIndex: nextIndex,
          isFlipped: false,
          status: 'completed',
          isLoading: false,
          sessionStartTime: null,
        });
      } else {
        set({
          currentIndex: nextIndex,
          isFlipped: false,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Kelime öğrenildi olarak işaretlenemedi',
      });
    }
  },

  _moveToNextWordWithoutMarking: () => {
    const { sessionWords, currentIndex, sessionStartTime } = get();
    const nextIndex = currentIndex + 1;

    if (nextIndex >= sessionWords.length) {
      // Session complete - record time spent for practice sessions
      if (sessionStartTime) {
        const timeSpentSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
        const today = getTodayDateString();
        void useStatisticStore.getState().addTimeSpent(today, timeSpentSeconds);
      }

      set({
        currentIndex: nextIndex,
        isFlipped: false,
        status: 'completed',
        sessionStartTime: null,
      });
    } else {
      set({
        currentIndex: nextIndex,
        isFlipped: false,
      });
    }
  },

  finishSession: () => {
    set({
      sessionWords: [],
      currentIndex: 0,
      isFlipped: false,
      status: 'idle',
    });
    void get().fetchUnlearnedCount();
  },

  reset: () => {
    set(initialState);
  },
}));
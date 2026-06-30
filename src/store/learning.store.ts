import { create } from 'zustand';

import { getLearningService } from '@/services/learning/learning.service';
import type { Word } from '@/types/word';

type LearningStoreState = {
  sessionWords: Word[];
  currentIndex: number;
  currentStep: number; // 0: Word, 1: Meaning, 2: Example
  status: 'idle' | 'loading' | 'active' | 'completed';
  unlearnedCount: number;
  isLoading: boolean;
  error: string | null;
};

type LearningStoreActions = {
  fetchUnlearnedCount: (listId?: number) => Promise<void>;
  startSession: (limit?: number, listId?: number) => Promise<void>;
  nextStep: () => Promise<void>;
  finishSession: () => void;
  reset: () => void;
  _moveToNextWord: (wordId: number) => Promise<void>;
};

export type LearningStore = LearningStoreState & LearningStoreActions;

const initialState: LearningStoreState = {
  sessionWords: [],
  currentIndex: 0,
  currentStep: 0,
  status: 'idle',
  unlearnedCount: 0,
  isLoading: false,
  error: null,
};

export const useLearningStore = create<LearningStore>((set, get) => ({
  ...initialState,

  fetchUnlearnedCount: async (listId?: number) => {
    try {
      const service = await getLearningService();
      const count = await service.getUnlearnedCount(listId);
      set({ unlearnedCount: count });
    } catch (error) {
      console.error('Failed to fetch unlearned count:', error);
    }
  },

  startSession: async (limit = 10, listId?: number) => {
    set({ isLoading: true, error: null, status: 'loading' });
    try {
      const service = await getLearningService();
      const sessionWords = await service.getUnlearnedWords(limit, listId);

      if (sessionWords.length === 0) {
        set({
          sessionWords: [],
          currentIndex: 0,
          currentStep: 0,
          status: 'idle',
          isLoading: false,
        });
        return;
      }

      set({
        sessionWords,
        currentIndex: 0,
        currentStep: 0,
        status: 'active',
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        status: 'idle',
        error: error instanceof Error ? error.message : 'Failed to start learning session',
      });
    }
  },

  nextStep: async () => {
    const { sessionWords, currentIndex, currentStep } = get();
    if (currentIndex >= sessionWords.length) {
      return;
    }

    const currentWord = sessionWords[currentIndex];

    // Determine the next step or next word
    if (currentStep === 0) {
      // Word -> Meaning
      set({ currentStep: 1 });
    } else if (currentStep === 1) {
      // Meaning -> Example (if example exists) or Next Word
      if (currentWord.example) {
        set({ currentStep: 2 });
      } else {
        // No example, mark as learned and go to next word
        await get()._moveToNextWord(currentWord.id);
      }
    } else if (currentStep === 2) {
      // Example -> Next Word
      await get()._moveToNextWord(currentWord.id);
    }
  },

  _moveToNextWord: async (wordId: number) => {
    const { sessionWords, currentIndex } = get();
    set({ isLoading: true });

    try {
      const service = await getLearningService();
      await service.markAsLearned(wordId);

      const nextIndex = currentIndex + 1;
      if (nextIndex >= sessionWords.length) {
        // Session complete!
        // Refresh unlearned count in background
        void get().fetchUnlearnedCount();
        set({
          currentIndex: nextIndex,
          status: 'completed',
          isLoading: false,
        });
      } else {
        set({
          currentIndex: nextIndex,
          currentStep: 0,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to mark word as learned',
      });
    }
  },

  finishSession: () => {
    set({
      sessionWords: [],
      currentIndex: 0,
      currentStep: 0,
      status: 'idle',
    });
    void get().fetchUnlearnedCount();
  },

  reset: () => {
    set(initialState);
  },
}));

import { create } from 'zustand';

import { getReviewService } from '@/services/review/review.service';
import { useStatisticStore } from '@/store/statistic.store';
import type { ReviewQuality, ReviewWithWord } from '@/types/review';

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

type ReviewStoreState = {
  dueReviews: ReviewWithWord[];
  dueCount: number;
  sessionReviews: ReviewWithWord[];
  currentIndex: number;
  isRevealed: boolean;
  status: 'idle' | 'loading' | 'active' | 'completed';
  isLoading: boolean;
  error: string | null;
};

type ReviewStoreActions = {
  fetchDueReviews: () => Promise<void>;
  startSession: (limit?: number) => Promise<void>;
  revealMeaning: () => void;
  submitReview: (quality: ReviewQuality) => Promise<void>;
  advanceReview: () => void;
  finishSession: () => void;
  reset: () => void;
};

export type ReviewStore = ReviewStoreState & ReviewStoreActions;

const initialState: ReviewStoreState = {
  dueReviews: [],
  dueCount: 0,
  sessionReviews: [],
  currentIndex: 0,
  isRevealed: false,
  status: 'idle',
  isLoading: false,
  error: null,
};

export const useReviewStore = create<ReviewStore>((set, get) => ({
  ...initialState,

  fetchDueReviews: async () => {
    set({ isLoading: true, error: null });
    try {
      const service = await getReviewService();
      const [dueReviews, dueCount] = await Promise.all([
        service.getDueReviews(),
        service.getDueCount(),
      ]);

      set({
        dueReviews,
        dueCount,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Tekrarlar yüklenemedi',
      });
    }
  },

  startSession: async (limit = 20) => {
    set({ isLoading: true, error: null, status: 'loading' });
    try {
      const service = await getReviewService();
      const sessionReviews = await service.getDueReviews(Date.now(), limit);

      if (sessionReviews.length === 0) {
        set({
          sessionReviews: [],
          currentIndex: 0,
          isRevealed: false,
          status: 'idle',
          isLoading: false,
        });
        void get().fetchDueReviews();
        return;
      }

      set({
        sessionReviews,
        currentIndex: 0,
        isRevealed: false,
        status: 'active',
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        status: 'idle',
        error: error instanceof Error ? error.message : 'Tekrar oturumu başlatılamadı',
      });
    }
  },

  revealMeaning: () => {
    set({ isRevealed: true });
  },

  submitReview: async (quality: ReviewQuality) => {
    const { sessionReviews, currentIndex } = get();
    const currentReview = sessionReviews[currentIndex];

    if (!currentReview) {
      return;
    }

    try {
      const service = await getReviewService();
      await service.submitReview(currentReview.wordId, quality);

      // İstatistik kaydı
      const today = getTodayDateString();
      void useStatisticStore.getState().incrementWordsReviewed(today);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Tekrar kaydedilemedi',
      });
    }
  },

  advanceReview: () => {
    const { sessionReviews, currentIndex } = get();
    const nextIndex = currentIndex + 1;

    if (nextIndex >= sessionReviews.length) {
      set({
        currentIndex: nextIndex,
        isRevealed: false,
        status: 'completed',
      });
      return;
    }

    set({
      currentIndex: nextIndex,
      isRevealed: false,
    });
  },

  finishSession: () => {
    set({
      sessionReviews: [],
      currentIndex: 0,
      isRevealed: false,
      status: 'idle',
    });
    void get().fetchDueReviews();
  },

  reset: () => {
    set(initialState);
  },
}));

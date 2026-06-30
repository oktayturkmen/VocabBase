import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

import { useReviewStore } from '@/store/review.store';

export function useTodayReview() {
  const dueReviews = useReviewStore((state) => state.dueReviews);
  const dueCount = useReviewStore((state) => state.dueCount);
  const isLoading = useReviewStore((state) => state.isLoading);
  const error = useReviewStore((state) => state.error);
  const fetchDueReviews = useReviewStore((state) => state.fetchDueReviews);

  useFocusEffect(
    useCallback(() => {
      void fetchDueReviews();
    }, [fetchDueReviews]),
  );

  return {
    dueReviews,
    dueCount,
    isLoading,
    error,
    refetch: fetchDueReviews,
  };
}

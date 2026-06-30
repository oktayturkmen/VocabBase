import { useEffect } from 'react';

import { useWordStore } from '@/store';

export function useWordList() {
  const words = useWordStore((state) => state.words);
  const isLoading = useWordStore((state) => state.isLoading);
  const error = useWordStore((state) => state.error);
  const fetchWords = useWordStore((state) => state.fetchWords);
  const clearError = useWordStore((state) => state.clearError);

  useEffect(() => {
    void fetchWords();
  }, [fetchWords]);

  return {
    words,
    isLoading,
    error,
    refetch: fetchWords,
    clearError,
  };
}

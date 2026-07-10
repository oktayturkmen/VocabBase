import { useEffect } from 'react';

import { useWordStore } from '@/store';

/**
 * Kelime listesini yöneten hook.
 *
 * @param listId - Hangi listenin kelimelerinin yükleneceğini belirler.
 *   - `undefined` veya `'all'`: Tüm kelimeleri getirir (list_id filtresi yok)
 *   - `number`: Sadece belirtilen listeye ait kelimeleri getirir
 */
export function useWordList(listId?: number | 'all') {
  const words = useWordStore((state) => state.words);
  const isLoading = useWordStore((state) => state.isLoading);
  const error = useWordStore((state) => state.error);
  const fetchWords = useWordStore((state) => state.fetchWords);
  const clearError = useWordStore((state) => state.clearError);

  useEffect(() => {
    if (listId === 'all' || listId === undefined) {
      void fetchWords();
    } else {
      void fetchWords(listId);
    }
  }, [fetchWords, listId]);

  return {
    words,
    isLoading,
    error,
    refetch: () => {
      if (listId === 'all' || listId === undefined) {
        return fetchWords();
      }
      return fetchWords(listId);
    },
    clearError,
  };
}
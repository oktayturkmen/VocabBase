import { useCallback, useEffect, useState } from 'react';

import { getWordListService } from '@/services/word-list';
import { useListStore } from '@/store/list.store';
import { useWordStore } from '@/store';

import type { WordFormValues } from '../schemas/word-form.schema';
import { mapFormValuesToInput } from '../utils/word-form.utils';

export function useWordForm(wordId?: number) {
  const isEditMode = wordId !== undefined;
  const [selectedListIds, setSelectedListIds] = useState<number[]>([]);

  const selectedWord = useWordStore((state) => state.selectedWord);
  const isLoading = useWordStore((state) => state.isLoading);
  const error = useWordStore((state) => state.error);
  const fetchWordById = useWordStore((state) => state.fetchWordById);
  const createWord = useWordStore((state) => state.createWord);
  const updateWord = useWordStore((state) => state.updateWord);
  const clearSelectedWord = useWordStore((state) => state.clearSelectedWord);
  const clearError = useWordStore((state) => state.clearError);

  useEffect(() => {
    if (isEditMode && wordId !== undefined) {
      void fetchWordById(wordId);
    }

    return () => {
      clearSelectedWord();
    };
  }, [clearSelectedWord, fetchWordById, isEditMode, wordId]);

  useEffect(() => {
    if (!isEditMode || wordId === undefined) {
      return;
    }

    let isMounted = true;

    getWordListService()
      .then((service) => service.getListsForWord(wordId))
      .then((listIds) => {
        if (isMounted) {
          setSelectedListIds(listIds);
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to fetch word list assignments:', error);
      });

    return () => {
      isMounted = false;
    };
  }, [isEditMode, wordId]);

  const submit = useCallback(
    async (values: WordFormValues, listIds: number[]) => {
      clearError();
      const input = mapFormValuesToInput(values);
      const wordListService = await getWordListService();

      if (isEditMode && wordId !== undefined) {
        const updatedWord = await updateWord(wordId, input);

        if (!updatedWord) {
          throw new Error('Word not found');
        }

        await wordListService.setListsForWord(updatedWord.id, listIds);
        void useListStore.getState().fetchLists();
        return updatedWord;
      }

      const createdWord = await createWord(input);
      await wordListService.setListsForWord(createdWord.id, listIds);
      void useListStore.getState().fetchLists();

      return createdWord;
    },
    [clearError, createWord, isEditMode, updateWord, wordId],
  );

  const toggleListSelection = useCallback((listId: number) => {
    setSelectedListIds((currentListIds) =>
      currentListIds.includes(listId)
        ? currentListIds.filter((currentListId) => currentListId !== listId)
        : [...currentListIds, listId],
    );
  }, []);

  return {
    isEditMode,
    selectedWord,
    selectedListIds,
    toggleListSelection,
    isLoading,
    error,
    submit,
    clearError,
  };
}

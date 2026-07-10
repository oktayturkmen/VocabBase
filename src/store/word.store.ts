import { create } from 'zustand';

import { getDatabase } from '@/database/client';
import { createWordService } from '@/services/word';
import type { CreateWordInput, UpdateWordInput, Word } from '@/types/word';

type WordStoreState = {
  words: Word[];
  selectedWord: Word | null;
  isLoading: boolean;
  error: string | null;
  selectedListId: number | null;
};

type WordStoreActions = {
  fetchWords: (listId?: number) => Promise<void>;
  fetchWordById: (id: number) => Promise<void>;
  createWord: (input: CreateWordInput) => Promise<Word>;
  updateWord: (id: number, input: UpdateWordInput) => Promise<Word | null>;
  deleteWord: (id: number) => Promise<boolean>;
  deleteWords: (ids: number[]) => Promise<number>;
  clearError: () => void;
  clearSelectedWord: () => void;
  reset: () => void;
  setSelectedListId: (listId: number | null) => void;
};

export type WordStore = WordStoreState & WordStoreActions;

const initialState: WordStoreState = {
  words: [],
  selectedWord: null,
  isLoading: false,
  error: null,
  selectedListId: null,
};

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

export const useWordStore = create<WordStore>((set) => ({
  ...initialState,

  fetchWords: async (listId?: number) => {
    set({ isLoading: true, error: null, selectedListId: listId ?? null });

    try {
      const database = await getDatabase();
      const wordService = createWordService(database);
      const words = listId !== undefined
        ? await wordService.getByListId(listId)
        : await wordService.getAll();
      // Service katmanı created_at DESC sıralamasıyla döndürür;
      // store bu kronolojik sıralamayı korur, ekstra sıralama yapmaz.
      set({ words, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: getErrorMessage(error, 'Kelimeler yüklenemedi'),
      });
    }
  },

  fetchWordById: async (id: number) => {
    set({ isLoading: true, error: null });

    try {
      const database = await getDatabase();
      const wordService = createWordService(database);
      const selectedWord = await wordService.getById(id);
      set({ selectedWord, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: getErrorMessage(error, 'Kelime yüklenemedi'),
      });
    }
  },

  createWord: async (input: CreateWordInput) => {
    set({ isLoading: true, error: null });

    try {
      const database = await getDatabase();
      const wordService = createWordService(database);
      const createdWord = await wordService.create(input);

      // Yeni kelimeyi listenin başına ekle (created_at DESC sıralamasını korumak için).
      set((state) => ({
        words: [createdWord, ...state.words],
        isLoading: false,
      }));

      return createdWord;
    } catch (error) {
      set({
        isLoading: false,
        error: getErrorMessage(error, 'Kelime oluşturulamadı'),
      });
      throw error;
    }
  },

  updateWord: async (id: number, input: UpdateWordInput) => {
    set({ isLoading: true, error: null });

    try {
      const database = await getDatabase();
      const wordService = createWordService(database);
      const updatedWord = await wordService.update(id, input);

      if (updatedWord) {
        // Sıralamayı koruyarak güncellenmiş kelimeyi yerine koy.
        set((state) => ({
          words: state.words.map((word) => (word.id === id ? updatedWord : word)),
          selectedWord: state.selectedWord?.id === id ? updatedWord : state.selectedWord,
          isLoading: false,
        }));
      } else {
        set({ isLoading: false });
      }

      return updatedWord;
    } catch (error) {
      set({
        isLoading: false,
        error: getErrorMessage(error, 'Kelime güncellenemedi'),
      });
      throw error;
    }
  },

  deleteWord: async (id: number) => {
    set({ isLoading: true, error: null });

    try {
      const database = await getDatabase();
      const wordService = createWordService(database);
      const isDeleted = await wordService.delete(id);

      if (isDeleted) {
        set((state) => ({
          words: state.words.filter((word) => word.id !== id),
          selectedWord: state.selectedWord?.id === id ? null : state.selectedWord,
          isLoading: false,
        }));
      } else {
        set({ isLoading: false });
      }

      return isDeleted;
    } catch (error) {
      set({
        isLoading: false,
        error: getErrorMessage(error, 'Kelime silinemedi'),
      });
      throw error;
    }
  },

  deleteWords: async (ids: number[]) => {
    if (ids.length === 0) {
      return 0;
    }

    set({ isLoading: true, error: null });

    try {
      const database = await getDatabase();
      const wordService = createWordService(database);
      const deletedCount = await wordService.deleteMany(ids);

      set((state) => ({
        words: state.words.filter((word) => !ids.includes(word.id)),
        selectedWord: ids.includes(state.selectedWord?.id ?? -1) ? null : state.selectedWord,
        isLoading: false,
      }));

      return deletedCount;
    } catch (error) {
      set({
        isLoading: false,
        error: getErrorMessage(error, 'Kelimeler silinemedi'),
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  clearSelectedWord: () => set({ selectedWord: null }),

  setSelectedListId: (listId: number | null) => set({ selectedListId: listId }),

  reset: () => set(initialState),
}));
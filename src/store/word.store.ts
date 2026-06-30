import { create } from 'zustand';

import { getWordService } from '@/services/word';
import type { CreateWordInput, UpdateWordInput, Word } from '@/types/word';

type WordStoreState = {
  words: Word[];
  selectedWord: Word | null;
  isLoading: boolean;
  error: string | null;
};

type WordStoreActions = {
  fetchWords: () => Promise<void>;
  fetchWordById: (id: number) => Promise<void>;
  createWord: (input: CreateWordInput) => Promise<Word>;
  updateWord: (id: number, input: UpdateWordInput) => Promise<Word | null>;
  deleteWord: (id: number) => Promise<boolean>;
  clearError: () => void;
  clearSelectedWord: () => void;
  reset: () => void;
};

export type WordStore = WordStoreState & WordStoreActions;

const initialState: WordStoreState = {
  words: [],
  selectedWord: null,
  isLoading: false,
  error: null,
};

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

function sortWords(words: Word[]): Word[] {
  return [...words].sort((firstWord, secondWord) => firstWord.word.localeCompare(secondWord.word));
}

export const useWordStore = create<WordStore>((set) => ({
  ...initialState,

  fetchWords: async () => {
    set({ isLoading: true, error: null });

    try {
      const wordService = await getWordService();
      const words = await wordService.getAll();
      set({ words, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: getErrorMessage(error, 'Failed to fetch words'),
      });
    }
  },

  fetchWordById: async (id: number) => {
    set({ isLoading: true, error: null });

    try {
      const wordService = await getWordService();
      const selectedWord = await wordService.getById(id);
      set({ selectedWord, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: getErrorMessage(error, 'Failed to fetch word'),
      });
    }
  },

  createWord: async (input: CreateWordInput) => {
    set({ isLoading: true, error: null });

    try {
      const wordService = await getWordService();
      const createdWord = await wordService.create(input);

      set((state) => ({
        words: sortWords([...state.words, createdWord]),
        isLoading: false,
      }));

      return createdWord;
    } catch (error) {
      set({
        isLoading: false,
        error: getErrorMessage(error, 'Failed to create word'),
      });
      throw error;
    }
  },

  updateWord: async (id: number, input: UpdateWordInput) => {
    set({ isLoading: true, error: null });

    try {
      const wordService = await getWordService();
      const updatedWord = await wordService.update(id, input);

      if (updatedWord) {
        set((state) => ({
          words: sortWords(state.words.map((word) => (word.id === id ? updatedWord : word))),
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
        error: getErrorMessage(error, 'Failed to update word'),
      });
      throw error;
    }
  },

  deleteWord: async (id: number) => {
    set({ isLoading: true, error: null });

    try {
      const wordService = await getWordService();
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
        error: getErrorMessage(error, 'Failed to delete word'),
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  clearSelectedWord: () => set({ selectedWord: null }),

  reset: () => set(initialState),
}));

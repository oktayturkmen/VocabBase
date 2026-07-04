import { create } from 'zustand';

import { getListService, type ListWithWordCount } from '@/services/list';

type ListStoreState = {
  lists: ListWithWordCount[];
  selectedListId: number | null;
  isLoading: boolean;
  error: string | null;
};

type ListStoreActions = {
  fetchLists: () => Promise<void>;
  createList: (name: string, description?: string) => Promise<void>;
  updateList: (id: number, data: { name?: string; description?: string }) => Promise<void>;
  deleteList: (id: number) => Promise<void>;
  selectList: (id: number | null) => void;
  reset: () => void;
};

export type ListStore = ListStoreState & ListStoreActions;

const initialState: ListStoreState = {
  lists: [],
  selectedListId: null,
  isLoading: false,
  error: null,
};

export const useListStore = create<ListStore>((set, get) => ({
  ...initialState,

  fetchLists: async () => {
    set({ isLoading: true, error: null });
    try {
      const service = await getListService();
      const lists = await service.getAllWithWordCounts();

      set({
        lists,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Listeler yüklenemedi',
      });
    }
  },

  createList: async (name: string, description?: string) => {
    set({ isLoading: true, error: null });
    try {
      const service = await getListService();
      const newList = await service.create({ name, description: description ?? null });
      const listWithCount: ListWithWordCount = {
        ...newList,
        wordCount: 0,
      };

      set((state) => ({
        lists: [listWithCount, ...state.lists],
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Liste oluşturulamadı',
      });
    }
  },

  updateList: async (id: number, data: { name?: string; description?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const service = await getListService();
      const updatedList = await service.update(id, data);

      set((state) => ({
        lists: state.lists.map((list) =>
          list.id === id ? { ...updatedList, wordCount: list.wordCount } : list,
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Liste güncellenemedi',
      });
    }
  },

  deleteList: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const service = await getListService();
      await service.delete(id);

      set((state) => ({
        lists: state.lists.filter((list) => list.id !== id),
        selectedListId: state.selectedListId === id ? null : state.selectedListId,
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Liste silinemedi',
      });
    }
  },

  selectList: (id: number | null) => {
    set({ selectedListId: id });
  },

  reset: () => {
    set(initialState);
  },
}));

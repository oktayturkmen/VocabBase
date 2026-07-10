import { create } from 'zustand';

import type { RoleplayMessage } from '@/services/ai/roleplay.service';
import { sendRoleplayMessage, startRoleplaySession } from '@/services/ai/roleplay.service';

/**
 * Roleplay oturumunun durumunu temsil eder.
 * - `idle`: Henüz başlatılmamış
 * - `loading`: Senaryo başlatılıyor veya mesaj gönderiliyor
 * - `active`: Sohbet aktif
 * - `error`: Hata oluştu
 */
type RoleplayStatus = 'idle' | 'loading' | 'active' | 'error';

type RoleplayStoreState = {
  status: RoleplayStatus;
  scenario: string | null;
  targetWords: string[];
  messages: RoleplayMessage[];
  usedWords: string[];
  error: string | null;
};

type RoleplayStoreActions = {
  startSession: (scenario: string, targetWords: string[]) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  resetSession: () => void;
};

export type RoleplayStore = RoleplayStoreState & RoleplayStoreActions;

const initialState: RoleplayStoreState = {
  status: 'idle',
  scenario: null,
  targetWords: [],
  messages: [],
  usedWords: [],
  error: null,
};

/**
 * Kullanıcının mesajında hedef kelimelerden herhangi birinin geçip geçmediğini kontrol eder.
 * Büyük/küçük harf duyarsız eşleştirme yapar.
 *
 * @param message - Kullanıcının gönderdiği mesaj
 * @param targetWords - Hedef kelimeler listesi
 * @returns Kullanılan kelimelerin listesi (boş array dönebilir)
 */
function findUsedWords(message: string, targetWords: string[]): string[] {
  const lowerMessage = message.toLowerCase();
  return targetWords.filter((word) => lowerMessage.includes(word.toLowerCase()));
}

export const useRoleplayStore = create<RoleplayStore>((set, get) => ({
  ...initialState,

  startSession: async (scenario: string, targetWords: string[]) => {
    set({
      ...initialState,
      status: 'loading',
      scenario,
      targetWords,
    });

    try {
      const greeting = await startRoleplaySession(scenario, targetWords);

      set({
        status: 'active',
        messages: [{ role: 'model', text: greeting }],
      });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Oturum başlatılamadı',
      });
    }
  },

  sendMessage: async (text: string) => {
    const { messages, targetWords, usedWords, status } = get();

    if (status !== 'active' || !text.trim()) {
      return;
    }

    // Kullanıcının mesajını hemen ekle (optimistic update)
    const userMessage: RoleplayMessage = { role: 'user', text };
    set({
      status: 'loading',
      messages: [...messages, userMessage],
    });

    // Kullanıcının mesajında hedef kelimelerden birini kullanıp kullanmadığını kontrol et
    const newlyUsedWords = findUsedWords(text, targetWords);
    const allUsedWords = [...new Set([...usedWords, ...newlyUsedWords])];

    try {
      const reply = await sendRoleplayMessage(messages, text, targetWords);

      set({
        status: 'active',
        messages: [...get().messages, { role: 'model', text: reply }],
        usedWords: allUsedWords,
      });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Mesaj gönderilemedi',
        usedWords: allUsedWords,
      });
    }
  },

  resetSession: () => {
    set(initialState);
  },
}));

import { create } from 'zustand';
import { getKeyValueStorage } from '@/services/storage/key-value-storage.service';

// Use existing storage service for persistence
const storage = getKeyValueStorage({ id: 'gamification' });

const GAMIFICATION_STORAGE_KEY = 'gamification_data';

type GamificationStoreState = {
  xp: number;
  level: number;
  badges: string[];
  levelUpTrigger: boolean;
};

type GamificationStoreActions = {
  addXp: (amount: number) => { leveledUp: boolean; newLevel?: number };
  unlockBadge: (badgeId: string) => { newlyUnlocked: boolean };
  checkAndUnlockBadge: (badgeId: string, condition: boolean) => { newlyUnlocked: boolean };
  resetLevelUpTrigger: () => void;
  reset: () => void;
  _loadFromStorage: () => void;
  _saveToStorage: () => void;
};

export type GamificationStore = GamificationStoreState & GamificationStoreActions;

const initialState: GamificationStoreState = {
  xp: 0,
  level: 1,
  badges: [],
  levelUpTrigger: false,
};

// Calculate required XP for a given level
function getRequiredXpForLevel(level: number): number {
  return level * 100;
}

// Calculate level from total XP
function calculateLevelFromXp(xp: number): number {
  let level = 1;
  let requiredXp = getRequiredXpForLevel(level);
  
  while (xp >= requiredXp) {
    level++;
    requiredXp = getRequiredXpForLevel(level);
  }
  
  return level;
}

// Calculate progress percentage to next level
function calculateProgressToNextLevel(xp: number, currentLevel: number): number {
  const currentLevelXp = getRequiredXpForLevel(currentLevel - 1);
  const nextLevelXp = getRequiredXpForLevel(currentLevel);
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  return Math.min(100, Math.max(0, progress));
}

export const useGamificationStore = create<GamificationStore>((set, get) => ({
  ...initialState,

  _loadFromStorage: () => {
    try {
      const storedData = storage.getString(GAMIFICATION_STORAGE_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        set({
          xp: parsed.xp ?? 0,
          level: parsed.level ?? 1,
          badges: parsed.badges ?? [],
          levelUpTrigger: false, // Don't restore trigger
        });
      }
    } catch (error) {
      // Storage hatası durumunda başlangıç değerleri kullanılır
      // Kullanıcı deneyimi bozulmaz, sadece loglanır
      console.error('[GamificationStore] Failed to load data from storage:', error instanceof Error ? error.message : error);
    }
  },

  _saveToStorage: () => {
    try {
      const { xp, level, badges } = get();
      const dataToStore = { xp, level, badges };
      storage.set(GAMIFICATION_STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      // Storage hatası durumunda XP kaybı olabilir ama uygulama çökmez
      // Kullanıcıya bildirim verilebilir veya retry mekanizması eklenebilir
      console.error('[GamificationStore] Failed to save data to storage:', error instanceof Error ? error.message : error);
      // Gelecekte buraya kullanıcı bildirimi veya retry mekanizması eklenebilir
    }
  },

  addXp: (amount: number) => {
    const { xp, level } = get();
    const newTotalXp = xp + amount;
    const newLevel = calculateLevelFromXp(newTotalXp);
    const leveledUp = newLevel > level;

    set({
      xp: newTotalXp,
      level: newLevel,
      levelUpTrigger: leveledUp,
    });

    get()._saveToStorage();

    return { leveledUp, newLevel: leveledUp ? newLevel : undefined };
  },

  unlockBadge: (badgeId: string) => {
    const { badges } = get();
    const newlyUnlocked = !badges.includes(badgeId);

    if (newlyUnlocked) {
      set({
        badges: [...badges, badgeId],
      });
      get()._saveToStorage();
    }

    return { newlyUnlocked };
  },

  checkAndUnlockBadge: (badgeId: string, condition: boolean) => {
    if (!condition) {
      return { newlyUnlocked: false };
    }
    return get().unlockBadge(badgeId);
  },

  resetLevelUpTrigger: () => {
    set({ levelUpTrigger: false });
  },

  reset: () => {
    set(initialState);
    get()._saveToStorage();
  },
}));

// Initialize store from storage on app start
useGamificationStore.getState()._loadFromStorage();

// Helper functions for UI
export function getProgressToNextLevel(): number {
  const { xp, level } = useGamificationStore.getState();
  return calculateProgressToNextLevel(xp, level);
}

export function getXpToNextLevel(): number {
  const { xp, level } = useGamificationStore.getState();
  const nextLevelXp = getRequiredXpForLevel(level);
  return Math.max(0, nextLevelXp - xp);
}

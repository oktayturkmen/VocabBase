export type WordRow = {
  id: number;
  word: string;
  meaning: string;
  example: string | null;
  pronunciation: string | null;
  created_at: number;
  updated_at: number;
};

export type NewWordRow = Omit<WordRow, 'id'>;

export type UpdateWordRow = Partial<Omit<WordRow, 'id' | 'created_at'>> & {
  updated_at: number;
};

export type Word = {
  id: number;
  word: string;
  meaning: string;
  example: string | null;
  pronunciation: string | null;
  createdAt: number;
  updatedAt: number;
};

export type CreateWordInput = {
  word: string;
  meaning: string;
  example?: string | null;
  pronunciation?: string | null;
};

export type UpdateWordInput = {
  word?: string;
  meaning?: string;
  example?: string | null;
  pronunciation?: string | null;
};

export type WordRow = {
  id: number;
  word: string;
  meaning: string;
  example: string | null;
  pronunciation: string | null;
  package_name: string;
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
  packageName: string;
  createdAt: number;
  updatedAt: number;
};

export type CreateWordInput = {
  word: string;
  meaning: string;
  example?: string | null;
  pronunciation?: string | null;
  packageName?: string;
};

export type UpdateWordInput = {
  word?: string;
  meaning?: string;
  example?: string | null;
  pronunciation?: string | null;
};

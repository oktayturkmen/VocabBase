export type WordListRow = {
  id: number;
  word_id: number;
  list_id: number;
  created_at: number;
};

export type NewWordListRow = Omit<WordListRow, 'id'>;

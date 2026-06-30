export type StatisticRow = {
  id: number;
  date: string;
  words_learned: number;
  words_reviewed: number;
  quiz_correct: number;
  quiz_incorrect: number;
  time_spent_seconds: number;
};

export type NewStatisticRow = Omit<StatisticRow, 'id'>;

export type UpdateStatisticRow = Partial<Omit<StatisticRow, 'id' | 'date'>>;

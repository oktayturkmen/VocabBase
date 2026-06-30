import type { Word } from './word';

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

export type Review = {
  id: number;
  wordId: number;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: number;
  lastReviewedAt: number | null;
};

export type ReviewWithWord = Review & {
  word: Word;
};

export const ReviewRating = {
  AGAIN: 0,
  HARD: 2,
  GOOD: 3,
  EASY: 5,
} as const satisfies Record<string, ReviewQuality>;

export type ReviewRow = {
  id: number;
  word_id: number;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: number;
  last_reviewed_at: number | null;
};

export type NewReviewRow = Omit<ReviewRow, 'id'>;

export type UpdateReviewRow = Partial<Omit<ReviewRow, 'id' | 'word_id'>>;

export type ReviewStateInput = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

export type ScheduledReviewResult = ReviewStateInput & {
  nextReviewAt: number;
  lastReviewedAt: number;
};

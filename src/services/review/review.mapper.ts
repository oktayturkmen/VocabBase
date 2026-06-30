import type { Review, ReviewRow } from '@/types/review';

export function mapRowToReview(row: ReviewRow): Review {
  return {
    id: row.id,
    wordId: row.word_id,
    easeFactor: row.ease_factor,
    intervalDays: row.interval_days,
    repetitions: row.repetitions,
    nextReviewAt: row.next_review_at,
    lastReviewedAt: row.last_reviewed_at,
  };
}

export function mapReviewToRow(review: Review): ReviewRow {
  return {
    id: review.id,
    word_id: review.wordId,
    ease_factor: review.easeFactor,
    interval_days: review.intervalDays,
    repetitions: review.repetitions,
    next_review_at: review.nextReviewAt,
    last_reviewed_at: review.lastReviewedAt,
  };
}

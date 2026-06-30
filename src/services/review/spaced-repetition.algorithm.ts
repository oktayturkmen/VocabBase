import type { ReviewQuality, ReviewStateInput, ScheduledReviewResult } from '@/types/review';

export const MIN_EASE_FACTOR = 1.3;
export const DEFAULT_EASE_FACTOR = 2.5;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

function clampEaseFactor(easeFactor: number): number {
  return Math.max(MIN_EASE_FACTOR, easeFactor);
}

function calculateEaseFactor(currentEaseFactor: number, quality: ReviewQuality): number {
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  return clampEaseFactor(currentEaseFactor + delta);
}

/**
 * SM-2 spaced repetition algorithm.
 * Quality scale: 0 (complete blackout) to 5 (perfect recall).
 */
export function calculateNextReview(
  current: ReviewStateInput,
  quality: ReviewQuality,
  reviewedAt: number,
): ScheduledReviewResult {
  let { easeFactor, intervalDays, repetitions } = current;

  if (quality >= 3) {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
    }

    repetitions += 1;
  } else {
    repetitions = 0;
    intervalDays = 1;
  }

  easeFactor = calculateEaseFactor(easeFactor, quality);

  return {
    easeFactor,
    intervalDays,
    repetitions,
    nextReviewAt: reviewedAt + intervalDays * MS_PER_DAY,
    lastReviewedAt: reviewedAt,
  };
}

export function createInitialReview(reviewedAt: number): ScheduledReviewResult {
  return calculateNextReview(
    {
      easeFactor: DEFAULT_EASE_FACTOR,
      intervalDays: 0,
      repetitions: 0,
    },
    3,
    reviewedAt,
  );
}

export function qualityFromCorrect(isCorrect: boolean): ReviewQuality {
  return isCorrect ? 4 : 1;
}

export function isReviewDue(nextReviewAt: number, at: number = Date.now()): boolean {
  return nextReviewAt <= at;
}

import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '@/database/client';
import { TABLES } from '@/database/tables';
import { mapRowToWord } from '@/services/word/word.mapper';
import type { Review, ReviewQuality, ReviewRow, ReviewWithWord } from '@/types/review';
import type { WordRow } from '@/types/word';

import { mapRowToReview } from './review.mapper';
import { calculateNextReview } from './spaced-repetition.algorithm';

type DueReviewRow = {
  id: number;
  word_id: number;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: number;
  last_reviewed_at: number | null;
  word: string;
  meaning: string;
  example: string | null;
  pronunciation: string | null;
  created_at: number;
  updated_at: number;
};

function mapDueReviewRow(row: DueReviewRow): ReviewWithWord {
  const wordRow: WordRow = {
    id: row.word_id,
    word: row.word,
    meaning: row.meaning,
    example: row.example,
    pronunciation: row.pronunciation,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  return {
    ...mapRowToReview(row),
    word: mapRowToWord(wordRow),
  };
}

export class ReviewService {
  constructor(private readonly database: SQLiteDatabase) {}

  async getByWordId(wordId: number): Promise<Review | null> {
    const row = await this.database.getFirstAsync<ReviewRow>(
      `SELECT * FROM ${TABLES.REVIEWS} WHERE word_id = ?`,
      wordId,
    );

    return row ? mapRowToReview(row) : null;
  }

  async getDueCount(at: number = Date.now()): Promise<number> {
    const result = await this.database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${TABLES.REVIEWS} WHERE next_review_at <= ?`,
      at,
    );

    return result?.count ?? 0;
  }

  async getDueReviews(at: number = Date.now(), limit = 50): Promise<ReviewWithWord[]> {
    const rows = await this.database.getAllAsync<DueReviewRow>(
      `SELECT
         r.id,
         r.word_id,
         r.ease_factor,
         r.interval_days,
         r.repetitions,
         r.next_review_at,
         r.last_reviewed_at,
         w.word,
         w.meaning,
         w.example,
         w.pronunciation,
         w.created_at,
         w.updated_at
       FROM ${TABLES.REVIEWS} AS r
       INNER JOIN ${TABLES.WORDS} AS w ON w.id = r.word_id
       WHERE r.next_review_at <= ?
       ORDER BY r.next_review_at ASC
       LIMIT ?`,
      at,
      limit,
    );

    return rows.map(mapDueReviewRow);
  }

  async deleteAll(): Promise<void> {
    await this.database.runAsync(`DELETE FROM ${TABLES.REVIEWS}`);
  }

  async submitReview(wordId: number, quality: ReviewQuality): Promise<Review> {
    const existingReview = await this.getByWordId(wordId);

    if (!existingReview) {
      throw new Error(`Review record not found for word id ${wordId}`);
    }

    const reviewedAt = Date.now();
    const nextReview = calculateNextReview(
      {
        easeFactor: existingReview.easeFactor,
        intervalDays: existingReview.intervalDays,
        repetitions: existingReview.repetitions,
      },
      quality,
      reviewedAt,
    );

    await this.database.runAsync(
      `UPDATE ${TABLES.REVIEWS}
       SET ease_factor = ?, interval_days = ?, repetitions = ?, next_review_at = ?, last_reviewed_at = ?
       WHERE word_id = ?`,
      nextReview.easeFactor,
      nextReview.intervalDays,
      nextReview.repetitions,
      nextReview.nextReviewAt,
      nextReview.lastReviewedAt,
      wordId,
    );

    const updatedReview = await this.getByWordId(wordId);

    if (!updatedReview) {
      throw new Error(`Failed to update review for word id ${wordId}`);
    }

    return updatedReview;
  }
}

export function createReviewService(database: SQLiteDatabase): ReviewService {
  return new ReviewService(database);
}

export async function getReviewService(): Promise<ReviewService> {
  const database = await getDatabase();
  return createReviewService(database);
}

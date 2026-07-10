import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '@/database/client';
import { TABLES } from '@/database/tables';
import { mapRowToWord } from '@/services/word/word.mapper';
import type { Word, WordRow } from '@/types/word';
import { getLocalDateString } from '@/utils/date';

const INSTALLED_PACKAGES_TABLE = 'installed_packages';

function buildActivePackageClause(): string {
  return `package_name IN (SELECT package_name FROM ${INSTALLED_PACKAGES_TABLE} WHERE is_active = 1)`;
}

export class LearningService {
  constructor(private readonly database: SQLiteDatabase) {}

  async getUnlearnedWords(limit = 10, listId?: number): Promise<Word[]> {
    if (listId !== undefined) {
      const rows = await this.database.getAllAsync<WordRow>(
        `SELECT ${TABLES.WORDS}.*
         FROM ${TABLES.WORDS}
         INNER JOIN ${TABLES.WORD_LISTS} ON ${TABLES.WORD_LISTS}.word_id = ${TABLES.WORDS}.id
         WHERE ${TABLES.WORD_LISTS}.list_id = ?
           AND ${TABLES.WORDS}.id NOT IN (SELECT word_id FROM ${TABLES.REVIEWS})
         ORDER BY ${TABLES.WORDS}.created_at ASC
         LIMIT ?`,
        listId,
        limit,
      );

      return rows.map(mapRowToWord);
    }

    const clause = buildActivePackageClause();
    const rows = await this.database.getAllAsync<WordRow>(
      `SELECT * FROM ${TABLES.WORDS}
       WHERE ${clause}
         AND id NOT IN (SELECT word_id FROM ${TABLES.REVIEWS})
       ORDER BY created_at ASC
       LIMIT ?`,
      limit,
    );

    return rows.map(mapRowToWord);
  }

  async getUnlearnedCount(listId?: number): Promise<number> {
    if (listId !== undefined) {
      const result = await this.database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count
         FROM ${TABLES.WORDS}
         INNER JOIN ${TABLES.WORD_LISTS} ON ${TABLES.WORD_LISTS}.word_id = ${TABLES.WORDS}.id
         WHERE ${TABLES.WORD_LISTS}.list_id = ?
           AND ${TABLES.WORDS}.id NOT IN (SELECT word_id FROM ${TABLES.REVIEWS})`,
        listId,
      );

      return result?.count ?? 0;
    }

    const clause = buildActivePackageClause();
    const result = await this.database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${TABLES.WORDS}
       WHERE ${clause}
         AND id NOT IN (SELECT word_id FROM ${TABLES.REVIEWS})`,
    );

    return result?.count ?? 0;
  }

  async getTotalWordCount(): Promise<number> {
    const clause = buildActivePackageClause();
    const result = await this.database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${TABLES.WORDS} WHERE ${clause}`,
    );

    return result?.count ?? 0;
  }

  async getRandomWords(limit = 5, listId?: number): Promise<Word[]> {
    if (listId !== undefined) {
      const rows = await this.database.getAllAsync<WordRow>(
        `SELECT ${TABLES.WORDS}.*
         FROM ${TABLES.WORDS}
         INNER JOIN ${TABLES.WORD_LISTS} ON ${TABLES.WORD_LISTS}.word_id = ${TABLES.WORDS}.id
         WHERE ${TABLES.WORD_LISTS}.list_id = ?
         ORDER BY RANDOM()
         LIMIT ?`,
        listId,
        limit,
      );

      return rows.map(mapRowToWord);
    }

    const clause = buildActivePackageClause();
    const rows = await this.database.getAllAsync<WordRow>(
      `SELECT * FROM ${TABLES.WORDS}
       WHERE ${clause}
       ORDER BY RANDOM()
       LIMIT ?`,
      limit,
    );

    return rows.map(mapRowToWord);
  }

  async getAllWordsFromList(listId: number): Promise<Word[]> {
    const rows = await this.database.getAllAsync<WordRow>(
      `SELECT ${TABLES.WORDS}.*
       FROM ${TABLES.WORDS}
       INNER JOIN ${TABLES.WORD_LISTS} ON ${TABLES.WORD_LISTS}.word_id = ${TABLES.WORDS}.id
       WHERE ${TABLES.WORD_LISTS}.list_id = ?
       ORDER BY ${TABLES.WORDS}.created_at ASC`,
      listId,
    );

    return rows.map(mapRowToWord);
  }

  async markAsLearned(wordId: number): Promise<void> {
    const timestamp = Date.now();
    // 1 day in milliseconds
    const oneDayMs = 24 * 60 * 60 * 1000;
    const nextReviewAt = timestamp + oneDayMs;

    const dateStr = getLocalDateString();

    await this.database.withTransactionAsync(async () => {
      // 1. Insert review record
      await this.database.runAsync(
        `INSERT INTO ${TABLES.REVIEWS} (word_id, ease_factor, interval_days, repetitions, next_review_at, last_reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        wordId,
        2.5, // default ease_factor
        1, // interval_days = 1 (review tomorrow)
        1, // repetitions = 1 (learned once)
        nextReviewAt,
        timestamp,
      );

      // 2. Update today's statistics
      await this.database.runAsync(
        `INSERT INTO ${TABLES.STATISTICS} (date, words_learned)
         VALUES (?, 1)
         ON CONFLICT(date) DO UPDATE SET words_learned = words_learned + 1`,
        dateStr,
      );
    });
  }
}

export function createLearningService(database: SQLiteDatabase): LearningService {
  return new LearningService(database);
}

export async function getLearningService(): Promise<LearningService> {
  const database = await getDatabase();
  return createLearningService(database);
}

import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '@/database/client';
import { TABLES } from '@/database/tables';
import type { StatisticRow, NewStatisticRow, UpdateStatisticRow } from '@/types/statistic';

export class StatisticService {
  constructor(private readonly database: SQLiteDatabase) {}

  async getByDate(date: string): Promise<StatisticRow | null> {
    const row = await this.database.getFirstAsync<StatisticRow>(
      `SELECT * FROM ${TABLES.STATISTICS} WHERE date = ?`,
      date,
    );

    return row ?? null;
  }

  async create(data: NewStatisticRow): Promise<StatisticRow> {
    await this.database.runAsync(
      `INSERT INTO ${TABLES.STATISTICS} (date, words_learned, words_reviewed, quiz_correct, quiz_incorrect, time_spent_seconds)
       VALUES (?, ?, ?, ?, ?, ?)`,
      data.date,
      data.words_learned,
      data.words_reviewed,
      data.quiz_correct,
      data.quiz_incorrect,
      data.time_spent_seconds,
    );

    const created = await this.getByDate(data.date);

    if (!created) {
      throw new Error('Failed to create statistic');
    }

    return created;
  }

  async update(date: string, data: UpdateStatisticRow): Promise<StatisticRow> {
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (data.words_learned !== undefined) {
      updates.push('words_learned = ?');
      values.push(data.words_learned);
    }
    if (data.words_reviewed !== undefined) {
      updates.push('words_reviewed = ?');
      values.push(data.words_reviewed);
    }
    if (data.quiz_correct !== undefined) {
      updates.push('quiz_correct = ?');
      values.push(data.quiz_correct);
    }
    if (data.quiz_incorrect !== undefined) {
      updates.push('quiz_incorrect = ?');
      values.push(data.quiz_incorrect);
    }
    if (data.time_spent_seconds !== undefined) {
      updates.push('time_spent_seconds = ?');
      values.push(data.time_spent_seconds);
    }

    if (updates.length === 0) {
      const existing = await this.getByDate(date);
      if (!existing) {
        throw new Error('Statistic not found');
      }
      return existing;
    }

    values.push(date);

    await this.database.runAsync(
      `UPDATE ${TABLES.STATISTICS} SET ${updates.join(', ')} WHERE date = ?`,
      ...values,
    );

    const updated = await this.getByDate(date);

    if (!updated) {
      throw new Error('Failed to update statistic');
    }

    return updated;
  }

  async incrementWordsLearned(date: string): Promise<StatisticRow> {
    const existing = await this.getByDate(date);

    if (!existing) {
      return this.create({
        date,
        words_learned: 1,
        words_reviewed: 0,
        quiz_correct: 0,
        quiz_incorrect: 0,
        time_spent_seconds: 0,
      });
    }

    return this.update(date, {
      words_learned: existing.words_learned + 1,
    });
  }

  async incrementWordsReviewed(date: string): Promise<StatisticRow> {
    const existing = await this.getByDate(date);

    if (!existing) {
      return this.create({
        date,
        words_learned: 0,
        words_reviewed: 1,
        quiz_correct: 0,
        quiz_incorrect: 0,
        time_spent_seconds: 0,
      });
    }

    return this.update(date, {
      words_reviewed: existing.words_reviewed + 1,
    });
  }

  async incrementQuizCorrect(date: string): Promise<StatisticRow> {
    const existing = await this.getByDate(date);

    if (!existing) {
      return this.create({
        date,
        words_learned: 0,
        words_reviewed: 0,
        quiz_correct: 1,
        quiz_incorrect: 0,
        time_spent_seconds: 0,
      });
    }

    return this.update(date, {
      quiz_correct: existing.quiz_correct + 1,
    });
  }

  async incrementQuizIncorrect(date: string): Promise<StatisticRow> {
    const existing = await this.getByDate(date);

    if (!existing) {
      return this.create({
        date,
        words_learned: 0,
        words_reviewed: 0,
        quiz_correct: 0,
        quiz_incorrect: 1,
        time_spent_seconds: 0,
      });
    }

    return this.update(date, {
      quiz_incorrect: existing.quiz_incorrect + 1,
    });
  }

  async addTimeSpent(date: string, seconds: number): Promise<StatisticRow> {
    const existing = await this.getByDate(date);

    if (!existing) {
      return this.create({
        date,
        words_learned: 0,
        words_reviewed: 0,
        quiz_correct: 0,
        quiz_incorrect: 0,
        time_spent_seconds: seconds,
      });
    }

    return this.update(date, {
      time_spent_seconds: existing.time_spent_seconds + seconds,
    });
  }

  async getRecent(days: number = 7): Promise<StatisticRow[]> {
    const rows = await this.database.getAllAsync<StatisticRow>(
      `SELECT * FROM ${TABLES.STATISTICS}
       WHERE date >= date('now', '-' || ? || ' days')
       ORDER BY date DESC`,
      days,
    );

    return rows;
  }

  async getTotal(): Promise<{
    totalWordsLearned: number;
    totalWordsReviewed: number;
    totalQuizCorrect: number;
    totalQuizIncorrect: number;
    totalTimeSpentSeconds: number;
  }> {
    const result = await this.database.getFirstAsync<{
      total_words_learned: number;
      total_words_reviewed: number;
      total_quiz_correct: number;
      total_quiz_incorrect: number;
      total_time_spent_seconds: number;
    }>(
      `SELECT
         SUM(words_learned) AS total_words_learned,
         SUM(words_reviewed) AS total_words_reviewed,
         SUM(quiz_correct) AS total_quiz_correct,
         SUM(quiz_incorrect) AS total_quiz_incorrect,
         SUM(time_spent_seconds) AS total_time_spent_seconds
       FROM ${TABLES.STATISTICS}`,
    );

    return {
      totalWordsLearned: result?.total_words_learned ?? 0,
      totalWordsReviewed: result?.total_words_reviewed ?? 0,
      totalQuizCorrect: result?.total_quiz_correct ?? 0,
      totalQuizIncorrect: result?.total_quiz_incorrect ?? 0,
      totalTimeSpentSeconds: result?.total_time_spent_seconds ?? 0,
    };
  }
}

export function createStatisticService(database: SQLiteDatabase): StatisticService {
  return new StatisticService(database);
}

export async function getStatisticService(): Promise<StatisticService> {
  const database = await getDatabase();
  return createStatisticService(database);
}

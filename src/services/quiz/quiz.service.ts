import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '@/database/client';
import { TABLES } from '@/database/tables';
import { mapRowToWord } from '@/services/word/word.mapper';
import type { Word, WordRow } from '@/types/word';

export class QuizService {
  constructor(private readonly database: SQLiteDatabase) {}

  async getQuizWords(limit = 10): Promise<Word[]> {
    // 1. Fetch learned words
    const learnedRows = await this.database.getAllAsync<WordRow>(
      `SELECT * FROM ${TABLES.WORDS}
       WHERE id IN (SELECT word_id FROM ${TABLES.REVIEWS})
       ORDER BY RANDOM()
       LIMIT ?`,
      limit,
    );

    let words = learnedRows.map(mapRowToWord);

    // 2. If we need more words, fetch unlearned words to fill the limit
    if (words.length < limit) {
      const needed = limit - words.length;
      const unlearnedRows = await this.database.getAllAsync<WordRow>(
        `SELECT * FROM ${TABLES.WORDS}
         WHERE id NOT IN (SELECT word_id FROM ${TABLES.REVIEWS})
         ORDER BY RANDOM()
         LIMIT ?`,
        needed,
      );
      words = [...words, ...unlearnedRows.map(mapRowToWord)];
    }

    return words;
  }

  async getDistractors(wordId: number, limit = 3): Promise<string[]> {
    const rows = await this.database.getAllAsync<{ meaning: string }>(
      `SELECT meaning FROM ${TABLES.WORDS}
       WHERE id != ?
       ORDER BY RANDOM()
       LIMIT ?`,
      wordId,
      limit,
    );

    return rows.map((r) => r.meaning);
  }
}

export function createQuizService(database: SQLiteDatabase): QuizService {
  return new QuizService(database);
}

export async function getQuizService(): Promise<QuizService> {
  const database = await getDatabase();
  return createQuizService(database);
}

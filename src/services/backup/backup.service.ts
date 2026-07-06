import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION } from '@/constants/database';
import { TABLES } from '@/database/tables';
import type { BackupData } from '@/types/backup';

export async function createBackup(database: SQLiteDatabase): Promise<BackupData> {
  const words = await database.getAllAsync(`
    SELECT id, word, meaning, example, pronunciation, created_at, updated_at
    FROM ${TABLES.WORDS}
  `);

  const lists = await database.getAllAsync(`
    SELECT id, name, description, created_at, updated_at
    FROM ${TABLES.LISTS}
  `);

  const wordLists = await database.getAllAsync(`
    SELECT id, word_id, list_id, created_at
    FROM ${TABLES.WORD_LISTS}
  `);

  const reviews = await database.getAllAsync(`
    SELECT id, word_id, ease_factor, interval_days, repetitions, next_review_at, last_reviewed_at
    FROM ${TABLES.REVIEWS}
  `);

  const statistics = await database.getAllAsync(`
    SELECT id, date, words_learned, words_reviewed, quiz_correct, quiz_incorrect, time_spent_seconds
    FROM ${TABLES.STATISTICS}
  `);

  const aiExampleCache = await database.getAllAsync(`
    SELECT id, word, example, created_at
    FROM ${TABLES.AI_EXAMPLE_CACHE}
  `);

  return {
    version: DATABASE_VERSION,
    exported_at: Date.now(),
    words: words as BackupData['words'],
    lists: lists as BackupData['lists'],
    word_lists: wordLists as BackupData['word_lists'],
    reviews: reviews as BackupData['reviews'],
    statistics: statistics as BackupData['statistics'],
    ai_example_cache: aiExampleCache as BackupData['ai_example_cache'],
  };
}

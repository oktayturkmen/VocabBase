import type { SQLiteDatabase } from 'expo-sqlite';

import { TABLES } from '@/database/tables';
import { BackupDataSchema, type BackupData } from '@/types/backup';

export async function restoreBackup(
  database: SQLiteDatabase,
  backupData: unknown
): Promise<void> {
  const validatedData = BackupDataSchema.parse(backupData) as BackupData;

  await database.withTransactionAsync(async () => {
    // Clear existing data
    await database.execAsync(`
      DELETE FROM ${TABLES.WORD_LISTS};
      DELETE FROM ${TABLES.REVIEWS};
      DELETE FROM ${TABLES.STATISTICS};
      DELETE FROM ${TABLES.AI_EXAMPLE_CACHE};
      DELETE FROM ${TABLES.WORDS};
      DELETE FROM ${TABLES.LISTS};
      DELETE FROM ${TABLES.INSTALLED_PACKAGES};
    `);

    // Restore words
    for (const word of validatedData.words) {
      await database.runAsync(
        `INSERT INTO ${TABLES.WORDS} (id, word, meaning, example, pronunciation, package_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           word = excluded.word,
           meaning = excluded.meaning,
           example = excluded.example,
           pronunciation = excluded.pronunciation,
           package_name = excluded.package_name,
           updated_at = excluded.updated_at`,
        [
          word.id,
          word.word,
          word.meaning,
          word.example,
          word.pronunciation,
          word.package_name,
          word.created_at,
          word.updated_at,
        ]
      );
    }

    // Restore lists
    for (const list of validatedData.lists) {
      await database.runAsync(
        `INSERT INTO ${TABLES.LISTS} (id, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           description = excluded.description,
           updated_at = excluded.updated_at`,
        [list.id, list.name, list.description, list.created_at, list.updated_at]
      );
    }

    // Restore word lists
    for (const wordList of validatedData.word_lists) {
      await database.runAsync(
        `INSERT INTO ${TABLES.WORD_LISTS} (id, word_id, list_id, created_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           word_id = excluded.word_id,
           list_id = excluded.list_id`,
        [wordList.id, wordList.word_id, wordList.list_id, wordList.created_at]
      );
    }

    // Restore reviews
    for (const review of validatedData.reviews) {
      await database.runAsync(
        `INSERT INTO ${TABLES.REVIEWS} (id, word_id, ease_factor, interval_days, repetitions, next_review_at, last_reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           word_id = excluded.word_id,
           ease_factor = excluded.ease_factor,
           interval_days = excluded.interval_days,
           repetitions = excluded.repetitions,
           next_review_at = excluded.next_review_at,
           last_reviewed_at = excluded.last_reviewed_at`,
        [
          review.id,
          review.word_id,
          review.ease_factor,
          review.interval_days,
          review.repetitions,
          review.next_review_at,
          review.last_reviewed_at,
        ]
      );
    }

    // Restore statistics
    for (const statistic of validatedData.statistics) {
      await database.runAsync(
        `INSERT INTO ${TABLES.STATISTICS} (id, date, words_learned, words_reviewed, quiz_correct, quiz_incorrect, time_spent_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           date = excluded.date,
           words_learned = excluded.words_learned,
           words_reviewed = excluded.words_reviewed,
           quiz_correct = excluded.quiz_correct,
           quiz_incorrect = excluded.quiz_incorrect,
           time_spent_seconds = excluded.time_spent_seconds`,
        [
          statistic.id,
          statistic.date,
          statistic.words_learned,
          statistic.words_reviewed,
          statistic.quiz_correct,
          statistic.quiz_incorrect,
          statistic.time_spent_seconds,
        ]
      );
    }

    // Restore AI example cache
    for (const cache of validatedData.ai_example_cache) {
      await database.runAsync(
        `INSERT INTO ${TABLES.AI_EXAMPLE_CACHE} (id, word, example, created_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           word = excluded.word,
           example = excluded.example`,
        [cache.id, cache.word, cache.example, cache.created_at]
      );
    }

    // Restore installed packages
    for (const pkg of validatedData.installed_packages) {
      await database.runAsync(
        `INSERT INTO ${TABLES.INSTALLED_PACKAGES} (id, package_name, is_active, installed_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(package_name) DO UPDATE SET
           is_active = excluded.is_active,
           installed_at = excluded.installed_at`,
        [pkg.id, pkg.package_name, pkg.is_active, pkg.installed_at]
      );
    }
  });
}
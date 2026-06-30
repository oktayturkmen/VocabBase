import type { SQLiteDatabase } from 'expo-sqlite';

import { TABLES } from '../tables';

export async function migration001(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLES.WORDS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      word TEXT NOT NULL,
      meaning TEXT NOT NULL,
      example TEXT,
      pronunciation TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_words_word ON ${TABLES.WORDS} (word);

    CREATE TABLE IF NOT EXISTS ${TABLES.LISTS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_lists_name ON ${TABLES.LISTS} (name);

    CREATE TABLE IF NOT EXISTS ${TABLES.WORD_LISTS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      word_id INTEGER NOT NULL,
      list_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (word_id) REFERENCES ${TABLES.WORDS} (id) ON DELETE CASCADE,
      FOREIGN KEY (list_id) REFERENCES ${TABLES.LISTS} (id) ON DELETE CASCADE,
      UNIQUE (word_id, list_id)
    );

    CREATE INDEX IF NOT EXISTS idx_word_lists_word_id ON ${TABLES.WORD_LISTS} (word_id);
    CREATE INDEX IF NOT EXISTS idx_word_lists_list_id ON ${TABLES.WORD_LISTS} (list_id);

    CREATE TABLE IF NOT EXISTS ${TABLES.REVIEWS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      word_id INTEGER NOT NULL UNIQUE,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      interval_days INTEGER NOT NULL DEFAULT 0,
      repetitions INTEGER NOT NULL DEFAULT 0,
      next_review_at INTEGER NOT NULL,
      last_reviewed_at INTEGER,
      FOREIGN KEY (word_id) REFERENCES ${TABLES.WORDS} (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_next_review_at ON ${TABLES.REVIEWS} (next_review_at);

    CREATE TABLE IF NOT EXISTS ${TABLES.STATISTICS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      date TEXT NOT NULL,
      words_learned INTEGER NOT NULL DEFAULT 0,
      words_reviewed INTEGER NOT NULL DEFAULT 0,
      quiz_correct INTEGER NOT NULL DEFAULT 0,
      quiz_incorrect INTEGER NOT NULL DEFAULT 0,
      time_spent_seconds INTEGER NOT NULL DEFAULT 0,
      UNIQUE (date)
    );

    CREATE TABLE IF NOT EXISTS ${TABLES.AI_EXAMPLE_CACHE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      word TEXT NOT NULL UNIQUE,
      example TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ai_example_cache_word ON ${TABLES.AI_EXAMPLE_CACHE} (word);
  `);
}

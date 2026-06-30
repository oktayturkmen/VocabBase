import type { SQLiteDatabase } from 'expo-sqlite';

import { TABLES } from '../tables';

export async function migration002(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLES.AI_EXAMPLE_CACHE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      word TEXT NOT NULL UNIQUE,
      example TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ai_example_cache_word ON ${TABLES.AI_EXAMPLE_CACHE} (word);
  `);
}

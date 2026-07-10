import type { SQLiteDatabase } from 'expo-sqlite';

import { TABLES } from '../tables';

export async function migration003(database: SQLiteDatabase): Promise<void> {
  // Check if package_name column already exists
  const tableInfo = await database.getAllAsync<any>(`PRAGMA table_info(${TABLES.WORDS})`);
  const columnExists = tableInfo.some((col: any) => col.name === 'package_name');

  if (!columnExists) {
    await database.execAsync(`
      ALTER TABLE ${TABLES.WORDS}
      ADD COLUMN package_name TEXT NOT NULL DEFAULT 'Başlangıç Paketi';
    `);
  }

  await database.execAsync(`
    DROP INDEX IF EXISTS idx_words_word;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_words_word_package
    ON ${TABLES.WORDS} (LOWER(word), package_name);
  `);
}

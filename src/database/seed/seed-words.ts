import type { SQLiteDatabase } from 'expo-sqlite';

import { TABLES } from '../tables';

import { SAMPLE_WORDS } from './sample-words';

async function hasExistingWords(database: SQLiteDatabase): Promise<boolean> {
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM ${TABLES.WORDS}`,
  );

  return (result?.count ?? 0) > 0;
}

export async function seedWords(database: SQLiteDatabase): Promise<void> {
  if (await hasExistingWords(database)) {
    return;
  }

  const timestamp = Date.now();

  await database.withTransactionAsync(async () => {
    for (const sampleWord of SAMPLE_WORDS) {
      await database.runAsync(
        `INSERT INTO ${TABLES.WORDS} (word, meaning, example, pronunciation, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        sampleWord.word,
        sampleWord.meaning,
        sampleWord.example,
        sampleWord.pronunciation,
        timestamp,
        timestamp,
      );
    }
  });
}

import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '@/database/client';
import { TABLES } from '@/database/tables';
import type { WordListRow } from '@/types/word-list';

export class WordListService {
  constructor(private readonly database: SQLiteDatabase) {}

  async getByWordId(wordId: number): Promise<WordListRow[]> {
    const rows = await this.database.getAllAsync<WordListRow>(
      `SELECT * FROM ${TABLES.WORD_LISTS} WHERE word_id = ?`,
      wordId,
    );
    return rows;
  }

  async getByListId(listId: number): Promise<WordListRow[]> {
    const rows = await this.database.getAllAsync<WordListRow>(
      `SELECT * FROM ${TABLES.WORD_LISTS} WHERE list_id = ?`,
      listId,
    );
    return rows;
  }

  async addWordToList(wordId: number, listId: number): Promise<WordListRow> {
    const now = Date.now();
    const result = await this.database.runAsync(
      `INSERT OR IGNORE INTO ${TABLES.WORD_LISTS} (word_id, list_id, created_at) VALUES (?, ?, ?)`,
      wordId,
      listId,
      now,
    );

    if (result.changes === 0) {
      // Already exists, fetch existing
      const existing = await this.database.getFirstAsync<WordListRow>(
        `SELECT * FROM ${TABLES.WORD_LISTS} WHERE word_id = ? AND list_id = ?`,
        wordId,
        listId,
      );
      if (!existing) {
        throw new Error('Kelime listeye eklenemedi');
      }
      return existing;
    }

    const created = await this.database.getFirstAsync<WordListRow>(
      `SELECT * FROM ${TABLES.WORD_LISTS} WHERE id = ?`,
      result.lastInsertRowId,
    );

    if (!created) {
      throw new Error('Kelime listeye eklenemedi');
    }

    return created;
  }

  async removeWordFromList(wordId: number, listId: number): Promise<void> {
    await this.database.runAsync(
      `DELETE FROM ${TABLES.WORD_LISTS} WHERE word_id = ? AND list_id = ?`,
      wordId,
      listId,
    );
  }

  async removeWordFromAllLists(wordId: number): Promise<void> {
    await this.database.runAsync(`DELETE FROM ${TABLES.WORD_LISTS} WHERE word_id = ?`, wordId);
  }

  async setListsForWord(wordId: number, listIds: number[]): Promise<void> {
    const uniqueListIds = Array.from(new Set(listIds));

    await this.database.withTransactionAsync(async () => {
      await this.removeWordFromAllLists(wordId);

      if (uniqueListIds.length === 0) {
        return;
      }

      const now = Date.now();
      await Promise.all(
        uniqueListIds.map((listId) =>
          this.database.runAsync(
            `INSERT INTO ${TABLES.WORD_LISTS} (word_id, list_id, created_at) VALUES (?, ?, ?)`,
            wordId,
            listId,
            now,
          ),
        ),
      );
    });
  }

  async removeAllWordsFromList(listId: number): Promise<void> {
    await this.database.runAsync(`DELETE FROM ${TABLES.WORD_LISTS} WHERE list_id = ?`, listId);
  }

  async setWordsForList(listId: number, wordIds: number[]): Promise<void> {
    const uniqueWordIds = Array.from(new Set(wordIds));

    await this.database.withTransactionAsync(async () => {
      await this.removeAllWordsFromList(listId);

      if (uniqueWordIds.length === 0) {
        return;
      }

      const now = Date.now();
      await Promise.all(
        uniqueWordIds.map((wordId) =>
          this.database.runAsync(
            `INSERT OR IGNORE INTO ${TABLES.WORD_LISTS} (word_id, list_id, created_at) VALUES (?, ?, ?)`,
            wordId,
            listId,
            now,
          ),
        ),
      );
    });
  }

  async getWordsForList(listId: number): Promise<number[]> {
    const rows = await this.database.getAllAsync<{ word_id: number }>(
      `SELECT word_id FROM ${TABLES.WORD_LISTS} WHERE list_id = ?`,
      listId,
    );
    return rows.map((row) => row.word_id);
  }

  async getListsForWord(wordId: number): Promise<number[]> {
    const rows = await this.database.getAllAsync<{ list_id: number }>(
      `SELECT list_id FROM ${TABLES.WORD_LISTS} WHERE word_id = ?`,
      wordId,
    );
    return rows.map((row) => row.list_id);
  }
}

export function createWordListService(database: SQLiteDatabase): WordListService {
  return new WordListService(database);
}

export async function getWordListService(): Promise<WordListService> {
  const database = await getDatabase();
  return createWordListService(database);
}

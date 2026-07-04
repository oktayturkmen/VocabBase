import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '@/database/client';
import { TABLES } from '@/database/tables';
import type { CreateWordInput, UpdateWordInput, Word, WordRow } from '@/types/word';

import { mapRowToWord } from './word.mapper';
import { validateCreateWordInput, validateUpdateWordInput } from './word.validation';

export class WordService {
  constructor(private readonly database: SQLiteDatabase) {}

  async getAll(): Promise<Word[]> {
    const rows = await this.database.getAllAsync<WordRow>(
      `SELECT * FROM ${TABLES.WORDS} ORDER BY created_at DESC`,
    );

    return rows.map(mapRowToWord);
  }

  async getByListId(listId: number): Promise<Word[]> {
    const rows = await this.database.getAllAsync<WordRow>(
      `SELECT ${TABLES.WORDS}.*
       FROM ${TABLES.WORDS}
       INNER JOIN ${TABLES.WORD_LISTS} ON ${TABLES.WORD_LISTS}.word_id = ${TABLES.WORDS}.id
       WHERE ${TABLES.WORD_LISTS}.list_id = ?
       ORDER BY ${TABLES.WORDS}.created_at DESC`,
      listId,
    );

    return rows.map(mapRowToWord);
  }

  async getById(id: number): Promise<Word | null> {
    const row = await this.database.getFirstAsync<WordRow>(
      `SELECT * FROM ${TABLES.WORDS} WHERE id = ?`,
      id,
    );

    return row ? mapRowToWord(row) : null;
  }

  async create(input: CreateWordInput): Promise<Word> {
    const validatedInput = validateCreateWordInput(input);
    const timestamp = Date.now();

    const result = await this.database.runAsync(
      `INSERT INTO ${TABLES.WORDS} (word, meaning, example, pronunciation, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      validatedInput.word,
      validatedInput.meaning,
      validatedInput.example ?? null,
      validatedInput.pronunciation ?? null,
      timestamp,
      timestamp,
    );

    const createdWord = await this.getById(result.lastInsertRowId);

    if (!createdWord) {
      throw new Error('Kelime oluşturulamadı');
    }

    return createdWord;
  }

  async update(id: number, input: UpdateWordInput): Promise<Word | null> {
    const existingWord = await this.getById(id);

    if (!existingWord) {
      return null;
    }

    const validatedInput = validateUpdateWordInput(input);
    const timestamp = Date.now();

    const updatedWord: Word = {
      ...existingWord,
      word: validatedInput.word ?? existingWord.word,
      meaning: validatedInput.meaning ?? existingWord.meaning,
      example: validatedInput.example !== undefined ? validatedInput.example : existingWord.example,
      pronunciation:
        validatedInput.pronunciation !== undefined
          ? validatedInput.pronunciation
          : existingWord.pronunciation,
      updatedAt: timestamp,
    };

    await this.database.runAsync(
      `UPDATE ${TABLES.WORDS}
       SET word = ?, meaning = ?, example = ?, pronunciation = ?, updated_at = ?
       WHERE id = ?`,
      updatedWord.word,
      updatedWord.meaning,
      updatedWord.example,
      updatedWord.pronunciation,
      updatedWord.updatedAt,
      id,
    );

    return updatedWord;
  }

  async delete(id: number): Promise<boolean> {
    let changes = 0;

    await this.database.withTransactionAsync(async () => {
      // 1. Clean up all word-list relationships for this word
      await this.database.runAsync(
        `DELETE FROM ${TABLES.WORD_LISTS} WHERE word_id = ?`,
        id,
      );

      // 2. Delete the word itself
      const result = await this.database.runAsync(
        `DELETE FROM ${TABLES.WORDS} WHERE id = ?`,
        id,
      );

      changes = result.changes;
    });

    return changes > 0;
  }

  async deleteMany(ids: number[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const placeholders = ids.map(() => '?').join(', ');
    let changes = 0;

    await this.database.withTransactionAsync(async () => {
      // 1. Clean up all word-list relationships for these words
      await this.database.runAsync(
        `DELETE FROM ${TABLES.WORD_LISTS} WHERE word_id IN (${placeholders})`,
        ...ids,
      );

      // 2. Delete the words themselves
      const result = await this.database.runAsync(
        `DELETE FROM ${TABLES.WORDS} WHERE id IN (${placeholders})`,
        ...ids,
      );

      changes = result.changes;
    });

    return changes;
  }
}

export function createWordService(database: SQLiteDatabase): WordService {
  return new WordService(database);
}

export async function getWordService(): Promise<WordService> {
  const database = await getDatabase();
  return createWordService(database);
}

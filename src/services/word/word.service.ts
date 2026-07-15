import type { SQLiteDatabase } from 'expo-sqlite';

import { DEFAULT_PACKAGE_NAME } from '@/constants/word-packages';
import { TABLES } from '@/database/tables';
import type { CreateWordInput, UpdateWordInput, Word, WordRow } from '@/types/word';
import type { LocalPackageWord } from '@/constants/word-packages';

import { mapRowToWord } from './word.mapper';
import { validateCreateWordInput, validateUpdateWordInput } from './word.validation';

export class PackageAlreadyLoadedError extends Error {
  constructor(packageName: string) {
    super(`"${packageName}" paketi zaten yüklü.`);
    this.name = 'PackageAlreadyLoadedError';
  }
}

export class WordService {
  constructor(private readonly database: SQLiteDatabase) {}

  /**
   * Paketin kelimelerinin yüklenip yüklenmediğini kontrol eder.
   * Bu fonksiyon WORDS tablosunu (actual data tablosu) kontrol eder.
   * Paketin kelime verilerinin veritabanında gerçekten bulunup bulunmadığını kontrol eder.
   *
   * Not: isPackageInstalled() fonksiyonundan farklıdır:
   * - isPackageInstalled: Paketin kurulum kaydı var mı (metadata)
   * - isPackageLoaded: Paketin kelimeleri yüklenmiş mi (actual data)
   *
   * @param packageName - Kontrol edilecek paket adı
   * @returns Paket kelimeleri yüklenmişse true, değilse false
   */
  async isPackageLoaded(packageName: string): Promise<boolean> {
    const result = await this.database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${TABLES.WORDS} WHERE package_name = ?`,
      packageName,
    );

    return (result?.count ?? 0) > 0;
  }

  async getPackageWordCount(packageName: string): Promise<number> {
    const result = await this.database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${TABLES.WORDS} WHERE package_name = ?`,
      packageName,
    );

    return result?.count ?? 0;
  }

  async loadPackageWords(
    words: LocalPackageWord[],
    packageName: string,
  ): Promise<{ imported: number; skipped: number }> {
    if (await this.isPackageLoaded(packageName)) {
      throw new PackageAlreadyLoadedError(packageName);
    }

    let imported = 0;
    let skipped = 0;
    const timestamp = Date.now();

    await this.database.withTransactionAsync(async () => {
      for (const item of words) {
        const word = item.word?.trim();
        const meaning = item.meaning?.trim();

        if (!word || !meaning) {
          skipped += 1;
          continue;
        }

        const existing = await this.database.getFirstAsync<{ id: number }>(
          `SELECT id FROM ${TABLES.WORDS} WHERE LOWER(word) = LOWER(?) AND package_name = ?`,
          word,
          packageName,
        );

        if (existing) {
          skipped += 1;
          continue;
        }

        const example = item.example?.trim() ?? null;

        await this.database.runAsync(
          `INSERT INTO ${TABLES.WORDS} (word, meaning, example, pronunciation, package_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          word,
          meaning,
          example,
          null,
          packageName,
          timestamp,
          timestamp,
        );

        imported += 1;
      }
    });

    return { imported, skipped };
  }

  async getWordsByPackageName(packageName: string): Promise<Word[]> {
    const rows = await this.database.getAllAsync<WordRow>(
      `SELECT * FROM ${TABLES.WORDS} WHERE package_name = ? ORDER BY created_at DESC`,
      packageName,
    );

    return rows.map(mapRowToWord);
  }

  async getRandomWordsByPackageName(packageName: string, limit: number): Promise<Word[]> {
    const rows = await this.database.getAllAsync<WordRow>(
      `SELECT * FROM ${TABLES.WORDS} WHERE package_name = ? ORDER BY RANDOM() LIMIT ?`,
      packageName,
      limit,
    );

    return rows.map(mapRowToWord);
  }

  async getAll(limit?: number): Promise<Word[]> {
    const rows = await this.database.getAllAsync<WordRow>(
      `SELECT * FROM ${TABLES.WORDS} ORDER BY created_at DESC${limit ? ` LIMIT ${limit}` : ''}`,
    );

    return rows.map(mapRowToWord);
  }

  /**
   * Kelime metnine göre (case-insensitive) arama yapar.
   * Tüm kelimeleri memory'e yüklemek yerine doğrudan SQL LIKE kullanır.
   *
   * @param query - Arama metni
   * @param limit - Maksimum sonuç sayısı
   * @returns Eşleşen kelimeler
   */
  async searchWords(query: string, limit: number = 100): Promise<Word[]> {
    const searchTerm = `%${query.trim()}%`;
    const rows = await this.database.getAllAsync<WordRow>(
      `SELECT * FROM ${TABLES.WORDS}
       WHERE word LIKE ? COLLATE NOCASE
       ORDER BY created_at DESC
       LIMIT ?`,
      searchTerm,
      limit,
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

  /**
   * En az bir listeye ait olan tüm kelimeleri getirir (tekrarsız).
   * "Listemdekiler" sekmesi için kullanılır.
   */
  async getWordsInAnyList(): Promise<Word[]> {
    const rows = await this.database.getAllAsync<WordRow>(
      `SELECT DISTINCT ${TABLES.WORDS}.*
       FROM ${TABLES.WORDS}
       INNER JOIN ${TABLES.WORD_LISTS} ON ${TABLES.WORD_LISTS}.word_id = ${TABLES.WORDS}.id
       ORDER BY ${TABLES.WORDS}.created_at DESC`,
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

  /**
   * Kelime metnine göre (case-insensitive) tek bir kelime getirir.
   * Tüm kelimeleri memory'e yüklemek yerine doğrudan SQL ile arar.
   *
   * @param word - Aranacak kelime metni
   * @returns Eşleşen kelime veya null
   */
  async getByWord(word: string): Promise<Word | null> {
    const row = await this.database.getFirstAsync<WordRow>(
      `SELECT * FROM ${TABLES.WORDS} WHERE LOWER(word) = LOWER(?)`,
      word,
    );

    return row ? mapRowToWord(row) : null;
  }

  /**
   * Veri tabanından rastgele belirtilen sayıda kelime getirir.
   * Tüm kelimeleri memory'e yükleyip karıştırmak yerine SQL seviyesinde
   * `ORDER BY RANDOM()` kullanır.
   *
   * @param limit - Getirilecek kelime sayısı
   * @returns Rastgele seçilmiş kelimeler
   */
  async getRandomWords(limit: number): Promise<Word[]> {
    const rows = await this.database.getAllAsync<WordRow>(
      `SELECT * FROM ${TABLES.WORDS} ORDER BY RANDOM() LIMIT ?`,
      limit,
    );

    return rows.map(mapRowToWord);
  }

  async create(input: CreateWordInput): Promise<Word> {
    const validatedInput = validateCreateWordInput(input);
    const timestamp = Date.now();

    const result = await this.database.runAsync(
      `INSERT INTO ${TABLES.WORDS} (word, meaning, example, pronunciation, package_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      validatedInput.word,
      validatedInput.meaning,
      validatedInput.example ?? null,
      validatedInput.pronunciation ?? null,
      input.packageName?.trim() || DEFAULT_PACKAGE_NAME,
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

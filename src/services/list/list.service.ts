import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '@/database/client';
import { TABLES } from '@/database/tables';
import type { ListRow, NewListRow, UpdateListRow } from '@/types/list';

export type ListWithWordCount = ListRow & {
  wordCount: number;
};

export class ListService {
  constructor(private readonly database: SQLiteDatabase) {}

  async getAll(): Promise<ListRow[]> {
    const rows = await this.database.getAllAsync<ListRow>(
      `SELECT * FROM ${TABLES.LISTS} ORDER BY created_at DESC`,
    );
    return rows;
  }

  async getAllWithWordCounts(): Promise<ListWithWordCount[]> {
    const rows = await this.database.getAllAsync<ListRow & { word_count: number }>(
      `SELECT ${TABLES.LISTS}.*, COUNT(${TABLES.WORD_LISTS}.word_id) AS word_count
       FROM ${TABLES.LISTS}
       LEFT JOIN ${TABLES.WORD_LISTS} ON ${TABLES.WORD_LISTS}.list_id = ${TABLES.LISTS}.id
       GROUP BY ${TABLES.LISTS}.id
       ORDER BY ${TABLES.LISTS}.created_at DESC`,
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at,
      wordCount: row.word_count,
    }));
  }

  async getById(id: number): Promise<ListRow | null> {
    const row = await this.database.getFirstAsync<ListRow>(
      `SELECT * FROM ${TABLES.LISTS} WHERE id = ?`,
      id,
    );
    return row ?? null;
  }

  async create(data: NewListRow): Promise<ListRow> {
    const now = Date.now();
    const result = await this.database.runAsync(
      `INSERT INTO ${TABLES.LISTS} (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      data.name,
      data.description ?? null,
      now,
      now,
    );

    const created = await this.getById(result.lastInsertRowId);

    if (!created) {
      throw new Error('Liste oluşturulamadı');
    }

    return created;
  }

  async update(id: number, data: UpdateListRow): Promise<ListRow> {
    const now = Date.now();
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description ?? null);
    }

    if (updates.length === 0) {
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error('Liste bulunamadı');
      }
      return existing;
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await this.database.runAsync(
      `UPDATE ${TABLES.LISTS} SET ${updates.join(', ')} WHERE id = ?`,
      ...values,
    );

    const updated = await this.getById(id);

    if (!updated) {
      throw new Error('Liste güncellenemedi');
    }

    return updated;
  }

  async delete(id: number): Promise<void> {
    await this.database.runAsync(`DELETE FROM ${TABLES.LISTS} WHERE id = ?`, id);
  }

  async getWordCount(listId: number): Promise<number> {
    const result = await this.database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${TABLES.WORD_LISTS} WHERE list_id = ?`,
      listId,
    );
    return result?.count ?? 0;
  }
}

export function createListService(database: SQLiteDatabase): ListService {
  return new ListService(database);
}

export async function getListService(): Promise<ListService> {
  const database = await getDatabase();
  return createListService(database);
}

import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION } from '@/constants/database';

import { migration001 } from './migrations/001_initial';
import { migration002 } from './migrations/002_add_ai_cache';

type Migration = (database: SQLiteDatabase) => Promise<void>;

const migrations: Migration[] = [migration001, migration002];

async function getCurrentVersion(database: SQLiteDatabase): Promise<number> {
  const result = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return result?.user_version ?? 0;
}

async function setVersion(database: SQLiteDatabase, version: number): Promise<void> {
  await database.execAsync(`PRAGMA user_version = ${version}`);
}

export async function runMigrations(database: SQLiteDatabase): Promise<void> {
  const currentVersion = await getCurrentVersion(database);

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  for (let version = currentVersion; version < DATABASE_VERSION; version += 1) {
    const migration = migrations[version];

    if (!migration) {
      throw new Error(`Missing migration for database version ${version + 1}`);
    }

    await database.withTransactionAsync(async () => {
      await migration(database);
    });

    await setVersion(database, version + 1);
  }
}

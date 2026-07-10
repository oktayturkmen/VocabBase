import * as SQLite from 'expo-sqlite';

import { DATABASE_NAME } from '@/constants/database';

import { runMigrations } from './migrate';
import { seedInitialPackage } from './seed/seed-initial-package';

let databaseInstance: SQLite.SQLiteDatabase | null = null;
let initializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function configureDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
}

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (databaseInstance) {
    return databaseInstance;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await configureDatabase(database);
      await runMigrations(database);
      await seedInitialPackage(database);
      databaseInstance = database;
      return database;
    } catch (error) {
      // Reset initialization promise on error to allow retry
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (databaseInstance) {
    return databaseInstance;
  }

  return initializeDatabase();
}

export async function closeDatabase(): Promise<void> {
  if (!databaseInstance) {
    return;
  }

  await databaseInstance.closeAsync();
  databaseInstance = null;
  initializationPromise = null;
}

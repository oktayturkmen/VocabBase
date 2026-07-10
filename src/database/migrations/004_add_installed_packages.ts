import type { SQLiteDatabase } from 'expo-sqlite';

import { TABLES } from '../tables';

export async function migration004(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS installed_packages (
      id TEXT PRIMARY KEY,
      package_name TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 1,
      installed_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_installed_packages_is_active 
    ON installed_packages (is_active);
  `);
}

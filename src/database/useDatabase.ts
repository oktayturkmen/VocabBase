import { useContext } from 'react';

import type { SQLiteDatabase } from 'expo-sqlite';

import { DatabaseContext } from './DatabaseProvider';

export function useDatabase(): SQLiteDatabase {
  const database = useContext(DatabaseContext);

  if (!database) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }

  return database;
}

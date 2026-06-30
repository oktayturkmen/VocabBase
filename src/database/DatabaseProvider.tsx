import { createContext, type ReactNode } from 'react';

import type { SQLiteDatabase } from 'expo-sqlite';

export const DatabaseContext = createContext<SQLiteDatabase | null>(null);

type DatabaseProviderProps = {
  children: ReactNode;
  value: SQLiteDatabase;
};

export function DatabaseProvider({ children, value }: DatabaseProviderProps) {
  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

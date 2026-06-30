import { useEffect, useState, type ReactNode } from 'react';

import type { SQLiteDatabase } from 'expo-sqlite';

import { Loading } from '@/components/Loading';

import { DatabaseProvider } from './DatabaseProvider';
import { initializeDatabase } from './client';

type DatabaseGateProps = {
  children: ReactNode;
};

export function DatabaseGate({ children }: DatabaseGateProps) {
  const [database, setDatabase] = useState<SQLiteDatabase | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    initializeDatabase()
      .then((db) => {
        if (isMounted) {
          setDatabase(db);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          const message = error instanceof Error ? error.message : 'Failed to initialize database';
          setErrorMessage(message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (errorMessage) {
    return <Loading message={errorMessage} fullScreen />;
  }

  if (!database) {
    return <Loading message="Loading database..." fullScreen />;
  }

  return <DatabaseProvider value={database}>{children}</DatabaseProvider>;
}

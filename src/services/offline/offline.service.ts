import { getDatabase } from '@/database/client';
import { TABLES } from '@/database/tables';
import { getKeyValueStorage } from '@/services/storage';

export type OfflineCheckStatus = 'idle' | 'passed' | 'failed';

export type OfflineReadinessResult = {
  status: OfflineCheckStatus;
  checkedAt: number;
  databaseReady: boolean;
  settingsReady: boolean;
  message: string;
};

const offlineStorage = getKeyValueStorage({ id: 'offline-readiness' });
const offlineCheckKey = 'lastCheck';

export async function runOfflineReadinessCheck(): Promise<OfflineReadinessResult> {
  const checkedAt = Date.now();

  try {
    const database = await getDatabase();
    await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${TABLES.WORDS}`,
    );
    await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${TABLES.REVIEWS}`,
    );

    offlineStorage.set(offlineCheckKey, String(checkedAt));
    const storedCheck = offlineStorage.getString(offlineCheckKey);
    offlineStorage.remove(offlineCheckKey);

    const settingsReady = storedCheck === String(checkedAt);
    const status = settingsReady ? 'passed' : 'failed';

    return {
      status,
      checkedAt,
      databaseReady: true,
      settingsReady,
      message:
        settingsReady && offlineStorage.isPersistent
          ? 'Offline storage is ready.'
          : settingsReady
            ? 'Offline storage is using temporary settings storage in this runtime.'
            : 'Settings storage could not be verified.',
    };
  } catch (error) {
    return {
      status: 'failed',
      checkedAt,
      databaseReady: false,
      settingsReady: false,
      message: error instanceof Error ? error.message : 'Offline readiness check failed.',
    };
  }
}

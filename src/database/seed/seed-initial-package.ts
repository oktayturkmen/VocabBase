import type { SQLiteDatabase } from 'expo-sqlite';

import { INITIAL_PACKAGE_NAME } from '@/constants/word-packages';
import type { LocalPackageWord } from '@/constants/word-packages';
import a1LevelAsset from '@/assets/packages/a1_level.json';
import {
  isPackageInstalled,
  markPackageInstalled,
} from '@/services/package/package-install.service';
import { createWordService } from '@/services/word/word.service';

export async function seedInitialPackage(database: SQLiteDatabase): Promise<void> {
  if (await isPackageInstalled(database, INITIAL_PACKAGE_NAME)) {
    return;
  }

  const wordService = createWordService(database);
  const isLoadedInDb = await wordService.isPackageLoaded(INITIAL_PACKAGE_NAME);

  if (isLoadedInDb) {
    await markPackageInstalled(database, INITIAL_PACKAGE_NAME);
    return;
  }

  const words = a1LevelAsset as LocalPackageWord[];
  await wordService.loadPackageWords(words, INITIAL_PACKAGE_NAME);
  await markPackageInstalled(database, INITIAL_PACKAGE_NAME);
}

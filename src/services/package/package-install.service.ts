import type { SQLiteDatabase } from 'expo-sqlite';

import { TABLES } from '@/database/tables';

export async function getInstalledPackageNames(db: SQLiteDatabase): Promise<string[]> {
  try {
    const rows = await db.getAllAsync<{ package_name: string }>(
      `SELECT package_name FROM ${TABLES.INSTALLED_PACKAGES} WHERE is_active = 1`
    );
    return rows.map((row) => row.package_name);
  } catch {
    return [];
  }
}

/**
 * Paketin kurulum kaydının varlığını kontrol eder.
 * Bu fonksiyon INSTALLED_PACKAGES tablosunu (metadata tablosu) kontrol eder.
 * Paketin "kurulmuş" olarak işaretlenip işaretlenmediğini kontrol eder.
 *
 * Not: isPackageLoaded() fonksiyonundan farklıdır:
 * - isPackageInstalled: Paketin kurulum kaydı var mı (metadata)
 * - isPackageLoaded: Paketin kelimeleri yüklenmiş mi (actual data)
 *
 * @param db - Veritabanı bağlantısı
 * @param packageName - Kontrol edilecek paket adı
 * @returns Paket kurulmuşsa true, değilse false
 */
export async function isPackageInstalled(db: SQLiteDatabase, packageName: string): Promise<boolean> {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${TABLES.INSTALLED_PACKAGES} WHERE package_name = ? AND is_active = 1`,
      packageName
    );
    return (result?.count ?? 0) > 0;
  } catch (error) {
    // Hata durumunda güvenli false döndür
    console.error('[isPackageInstalled] Error checking package installation:', error);
    return false;
  }
}

export async function markPackageInstalled(db: SQLiteDatabase, packageName: string): Promise<void> {
  try {
    const timestamp = Date.now();
    const id = packageName.toLowerCase().replace(/\s+/g, '_');

    await db.runAsync(
      `INSERT INTO ${TABLES.INSTALLED_PACKAGES} (id, package_name, is_active, installed_at)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(package_name) DO UPDATE SET is_active = 1, installed_at = ?`,
      id,
      packageName,
      timestamp,
      timestamp
    );
  } catch (error) {
    console.error('[PackageInstallService] Failed to mark package as installed:', error);
  }
}

export async function clearInstalledPackages(db: SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync(`DELETE FROM ${TABLES.INSTALLED_PACKAGES}`);
  } catch (error) {
    console.error('[PackageInstallService] Failed to clear installed packages:', error);
  }
}

export async function uninstallPackage(db: SQLiteDatabase, packageName: string): Promise<void> {
  try {
    await db.withTransactionAsync(async () => {
      // 1. Delete word lists relations
      await db.runAsync(
        `DELETE FROM ${TABLES.WORD_LISTS} WHERE word_id IN (SELECT id FROM ${TABLES.WORDS} WHERE package_name = ?)`,
        packageName
      );
      // 2. Delete reviews
      await db.runAsync(
        `DELETE FROM ${TABLES.REVIEWS} WHERE word_id IN (SELECT id FROM ${TABLES.WORDS} WHERE package_name = ?)`,
        packageName
      );
      // 3. Delete words belonging to the package
      await db.runAsync(
        `DELETE FROM ${TABLES.WORDS} WHERE package_name = ?`,
        packageName
      );
      // 4. Remove installation record
      await db.runAsync(
        `DELETE FROM ${TABLES.INSTALLED_PACKAGES} WHERE package_name = ?`,
        packageName
      );
    });
  } catch (error) {
    console.error('[PackageInstallService] Failed to uninstall package:', error);
    throw error;
  }
}

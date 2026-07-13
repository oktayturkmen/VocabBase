import type { SQLiteDatabase } from 'expo-sqlite';

const INSTALLED_PACKAGES_TABLE = 'installed_packages';

export async function getInstalledPackageNames(db: SQLiteDatabase): Promise<string[]> {
  try {
    const rows = await db.getAllAsync<{ package_name: string }>(
      `SELECT package_name FROM ${INSTALLED_PACKAGES_TABLE} WHERE is_active = 1`
    );
    return rows.map((row) => row.package_name);
  } catch {
    return [];
  }
}

export async function isPackageInstalled(db: SQLiteDatabase, packageName: string): Promise<boolean> {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${INSTALLED_PACKAGES_TABLE} WHERE package_name = ? AND is_active = 1`,
      packageName
    );
    return (result?.count ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function markPackageInstalled(db: SQLiteDatabase, packageName: string): Promise<void> {
  try {
    const timestamp = Date.now();
    const id = packageName.toLowerCase().replace(/\s+/g, '_');

    await db.runAsync(
      `INSERT INTO ${INSTALLED_PACKAGES_TABLE} (id, package_name, is_active, installed_at)
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
    await db.execAsync(`DELETE FROM ${INSTALLED_PACKAGES_TABLE}`);
  } catch (error) {
    console.error('[PackageInstallService] Failed to clear installed packages:', error);
  }
}

export async function uninstallPackage(db: SQLiteDatabase, packageName: string): Promise<void> {
  try {
    await db.withTransactionAsync(async () => {
      // 1. Delete word lists relations
      await db.runAsync(
        'DELETE FROM word_lists WHERE word_id IN (SELECT id FROM words WHERE package_name = ?)',
        packageName
      );
      // 2. Delete reviews
      await db.runAsync(
        'DELETE FROM reviews WHERE word_id IN (SELECT id FROM words WHERE package_name = ?)',
        packageName
      );
      // 3. Delete words belonging to the package
      await db.runAsync(
        'DELETE FROM words WHERE package_name = ?',
        packageName
      );
      // 4. Remove installation record
      await db.runAsync(
        `DELETE FROM ${INSTALLED_PACKAGES_TABLE} WHERE package_name = ?`,
        packageName
      );
    });
  } catch (error) {
    console.error('[PackageInstallService] Failed to uninstall package:', error);
    throw error;
  }
}

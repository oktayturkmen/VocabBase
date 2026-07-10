import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Migration 002 — AI Cache tablosu
 *
 * NOT: Bu tablo ve index zaten migration 001 (`001_initial.ts`) içinde
 * oluşturulmuştur. Bu migration tarihsel olarak eklendiğinde duplicate
 * kod içeriyordu; artık no-op olarak bırakılmıştır.
 *
 * Migration sisteminin index sıralamasını bozmamak için dosya silinmez,
 * bunun yerine boş bir implementasyon bırakılır.
 */
export async function migration002(_database: SQLiteDatabase): Promise<void> {
  // No-op: AI cache tablosu zaten migration 001'de oluşturuldu.
}
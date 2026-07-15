/**
 * Fisher-Yates (Knuth) karıştırma algoritması.
 *
 * `Array.sort(() => Math.random() - 0.5)` yaklaşımından farklı olarak
 * uniform (eşit dağılımlı) ve öngörülebilir bir karıştırma sağlar.
 *
 * Orijinal diziyi değiştirmez; yeni bir dizi döndürür.
 *
 * @param array - Karıştırılacak dizi
 * @returns Karıştırılmış yeni dizi
 */
export function shuffleArray<T>(array: readonly T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
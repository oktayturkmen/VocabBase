// ─── Groq API Ayarları ────────────────────────────────────────────────────
// Groq, OpenAI uyumlu bir API sunar. Ücretsiz, çok hızlı ve Llama 3 tabanlıdır.
// Google Gemini SDK'sı tamamen devreden çıkarılmıştır.
//
// Not: API anahtarı modül yükleme anında (module load time) sabit olarak
// değerlendirilmez; bunun yerine her çağrıda (call time) process.env üzerinden
// okunur. Bu, Expo'nun ortam değişkeni timing'i ile ilgili potansiyel sorunları
// önler ve anahtarın her zaman güncel değerle okunmasını sağlar.
export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
export const GROQ_MODEL = 'llama-3.1-8b-instant';
export const GROQ_CHAT_ENDPOINT = `${GROQ_BASE_URL}/chat/completions`;

/**
 * Groq API anahtarını process.env'den okur.
 * Her çağrıda okunarak module load time caching sorunları önlenir.
 *
 * @returns Groq API anahtarı veya undefined
 */
export function getGroqApiKey(): string | undefined {
  return process.env.EXPO_PUBLIC_GROQ_API_KEY;
}

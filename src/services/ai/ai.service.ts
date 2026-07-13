import { getDatabase } from '@/database/client';
import { TABLES } from '@/database/tables';

export class AIExampleGenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AIExampleGenerationError';
  }
}

export class AICacheError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AICacheError';
  }
}

// ─── Groq API Ayarları ────────────────────────────────────────────────────
// Groq, OpenAI uyumlu bir API sunar. Ücretsiz, çok hızlı ve Llama 3 tabanlıdır.
// Google Gemini SDK'sı tamamen devreden çıkarılmıştır.
//
// Not: API anahtarı modül yükleme anında (module load time) sabit olarak
// değerlendirilmez; bunun yerine her çağrıda (call time) process.env üzerinden
// okunur. Bu, Expo'nun ortam değişkeni timing'i ile ilgili potansiyel sorunları
// önler ve anahtarın her zaman güncel değerle okunmasını sağlar.
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_CHAT_ENDPOINT = `${GROQ_BASE_URL}/chat/completions`;

/**
 * Groq API anahtarını process.env'den okur.
 * Her çağrıda okunarak module load time caching sorunları önlenir.
 *
 * @returns Groq API anahtarı veya undefined
 */
function getGroqApiKey(): string | undefined {
  return process.env.EXPO_PUBLIC_GROQ_API_KEY;
}

interface GroqChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqChatChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface GroqChatResponse {
  id: string;
  choices: GroqChatChoice[];
}

interface GroqApiErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

export class AIStoryGenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AIStoryGenerationError';
  }
}

export class AIService {
  async generateExampleSentence(word: string, meaning: string): Promise<string> {
    const cached = await this.getCachedExample(word);
    if (cached) {
      return cached;
    }

    // API anahtarını çağrı anında (call time) oku
    const apiKey = getGroqApiKey();

    if (!apiKey) {
      const example = `The word "${word}" means "${meaning}".`;
      await this.cacheExample(word, example);
      return example;
    }

    try {
      const messages: GroqChatMessage[] = [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates example sentences for English vocabulary words. Generate simple, clear example sentences. Return only the sentence, no explanation.',
        },
        {
          role: 'user',
          content: `Generate a simple, clear example sentence for the English word "${word}" which means "${meaning}".`,
        },
      ];

      const response = await fetch(GROQ_CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          max_tokens: 100,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API ${response.status} hatası`);
      }

      const data = (await response.json()) as GroqChatResponse;
      const example = data.choices?.[0]?.message?.content?.trim();

      if (!example) {
        // API başarılı yanıt döndürdü ama içerik boş — güvenli fallback üret.
        // Promise<string> imzasını bozmamak için undefined dönmez.
        const fallback = `The word "${word}" means "${meaning}".`;
        await this.cacheExample(word, fallback);
        return fallback;
      }

      await this.cacheExample(word, example);
      return example;
    } catch {
      // API hatası durumunda güvenli fallback döndür ve cache'le.
      // Uygulamayı çökertmek yerine kullanıcının örneği görmesi sağlanır.
      const fallback = `The word "${word}" means "${meaning}".`;
      await this.cacheExample(word, fallback);
      return fallback;
    }
  }

  /**
   * Verilen kelimeleri kullanarak 4-5 cümlelik İngilizce bir hikaye üretir.
   * Hedef kelimeler hikaye içinde **kelime** şeklinde kalın (bold) işaretlenir.
   * API anahtarı yoksa veya hata olursa güvenli fallback döndürülür.
   * Groq API (llama-3.1-8b-instant) modeli kullanılır.
   */
  async generateStoryFromWords(words: string[]): Promise<string> {
    if (words.length === 0) {
      throw new AIStoryGenerationError('Hikaye üretmek için en az bir kelime gerekli');
    }

    const wordList = words.join(', ');

    // API anahtarını çağrı anında (call time) oku
    const apiKey = getGroqApiKey();

    if (!apiKey) {
      // API anahtarı yoksa akıllı fallback hikaye üret
      const highlightedWords = words.map((w) => `**${w}**`).join(', ');
      const fallbackStory = `Once upon a time, a student discovered that learning new things was a beautiful journey. By using ${highlightedWords}, they managed to improve their English step by step. Every day was a new opportunity to practice and achieve great success.`;
      console.warn('⚠️ [AI_FALLBACK] Canlı API isteği bypass edildi veya başarısız oldu, akıllı hazır hikaye devreye girdi.');
      return fallbackStory;
    }

    try {
      const messages: GroqChatMessage[] = [
        {
          role: 'system',
          content: 'You are a creative assistant that generates short English stories for vocabulary learning. Generate meaningful, fluent, creative stories at maximum B2 level. Do not just list words in sentences - create a real plot. Highlight target words as **word**.',
        },
        {
          role: 'user',
          content: `Sana verilen kelimeleri içeren, anlamlı, akıcı, yaratıcı ve maksimum B2 seviyesinde 4-5 cümlelik gerçek bir kısa hikaye yaz. Kelimeleri sadece liste halinde cümlelere dizme, gerçekten bir olay örgüsü olsun. Hedef kelimeleri **kelime** şeklinde döndür. Kelimeler: ${wordList}`,
        },
      ];

      const response = await fetch(GROQ_CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          max_tokens: 300,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API ${response.status} hatası`);
      }

      const data = (await response.json()) as GroqChatResponse;
      const story = data.choices?.[0]?.message?.content?.trim();

      if (!story) {
        throw new AIStoryGenerationError('AI boş hikaye döndürdü');
      }

      return story;
    } catch (error) {
      if (error instanceof AIStoryGenerationError) {
        throw error;
      }

      console.error('❌ [GERÇEK_HATA_DETAYI] API isteği tam olarak şu yüzden patladı:', error);

      // API hatası durumunda akıllı fallback
      const highlightedWords = words.map((w) => `**${w}**`).join(', ');
      const fallbackStory = `Once upon a time, a student discovered that learning new things was a beautiful journey. By using ${highlightedWords}, they managed to improve their English step by step. Every day was a new opportunity to practice and achieve great success.`;
      console.warn('⚠️ [AI_FALLBACK] Canlı API isteği bypass edildi veya başarısız oldu, akıllı hazır hikaye devreye girdi.');
      return fallbackStory;
    }
  }

  private async cacheExample(word: string, example: string): Promise<void> {
    try {
      const database = await getDatabase();
      await database.runAsync(
        `INSERT OR REPLACE INTO ${TABLES.AI_EXAMPLE_CACHE} (word, example, created_at) VALUES (?, ?, ?)`,
        word,
        example,
        Date.now(),
      );
    } catch (error) {
      throw new AICacheError(
        error instanceof Error ? error.message : 'Örnek önbelleğe alınamadı',
        error,
      );
    }
  }

  private async getCachedExample(word: string): Promise<string | null> {
    try {
      const database = await getDatabase();
      const row = await database.getFirstAsync<{ example: string }>(
        `SELECT example FROM ${TABLES.AI_EXAMPLE_CACHE} WHERE word = ?`,
        word,
      );
      return row?.example || null;
    } catch (error) {
      throw new AICacheError(
        error instanceof Error ? error.message : 'Önbelleğe alınmış örnek alınamadı',
        error,
      );
    }
  }

  async clearCache(): Promise<void> {
    try {
      const database = await getDatabase();
      await database.runAsync(`DELETE FROM ${TABLES.AI_EXAMPLE_CACHE}`);
    } catch (error) {
      throw new AICacheError(
        error instanceof Error ? error.message : 'Önbellek temizlenemedi',
        error,
      );
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const database = await getDatabase();
      const result = await database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM ${TABLES.AI_EXAMPLE_CACHE}`,
      );
      return result?.count ?? 0;
    } catch (error) {
      throw new AICacheError(
        error instanceof Error ? error.message : 'Önbellek boyutu alınamadı',
        error,
      );
    }
  }
}

let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}
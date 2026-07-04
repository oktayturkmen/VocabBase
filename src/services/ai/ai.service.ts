import axios from 'axios';

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

const AI_API_KEY = process.env.EXPO_PUBLIC_AI_API_KEY;

export class AIService {
  async generateExampleSentence(word: string, meaning: string): Promise<string> {
    const cached = await this.getCachedExample(word);
    if (cached) {
      return cached;
    }

    if (!AI_API_KEY) {
      const example = `The word "${word}" means "${meaning}".`;
      await this.cacheExample(word, example);
      return example;
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that generates example sentences for English vocabulary words.',
            },
            {
              role: 'user',
              content: `Generate a simple, clear example sentence for the English word "${word}" which means "${meaning}". Return only the sentence, no explanation.`,
            },
          ],
          max_tokens: 100,
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AI_API_KEY}`,
          },
        },
      );

      const example = response.data.choices[0]?.message?.content?.trim() || '';

      if (example) {
        await this.cacheExample(word, example);
      }

      return example;
    } catch {
      // API hatası durumunda güvenli fallback döndür ve cache'le.
      // Uygulamayı çökertmek yerine kullanıcının örneği görmesi sağlanır.
      const fallback = `The word "${word}" means "${meaning}".`;
      await this.cacheExample(word, fallback);
      return fallback;
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
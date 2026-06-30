import axios from 'axios';

import { getDatabase } from '@/database/client';
import { TABLES } from '@/database/tables';

export class AIService {
  private apiKey: string | null = null;

  constructor() {
    // API key should be stored in MMKV in production
    // For now, we'll use a placeholder
    this.apiKey = null;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  async generateExampleSentence(word: string, meaning: string): Promise<string> {
    // Check cache first
    const cached = await this.getCachedExample(word);
    if (cached) {
      return cached;
    }

    // If no API key is set, return a simple template
    if (!this.apiKey) {
      const example = `The word "${word}" means "${meaning}".`;
      await this.cacheExample(word, example);
      return example;
    }

    try {
      // Call AI API (example with OpenAI format)
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
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      const example = response.data.choices[0]?.message?.content?.trim() || '';

      if (example) {
        await this.cacheExample(word, example);
      }

      return example;
    } catch (error) {
      console.error('Failed to generate example sentence:', error);
      // Fallback to template
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
      console.error('Failed to cache example:', error);
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
      console.error('Failed to get cached example:', error);
      return null;
    }
  }

  async clearCache(): Promise<void> {
    try {
      const database = await getDatabase();
      await database.runAsync(`DELETE FROM ${TABLES.AI_EXAMPLE_CACHE}`);
    } catch (error) {
      console.error('Failed to clear cache:', error);
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
      console.error('Failed to get cache size:', error);
      return 0;
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

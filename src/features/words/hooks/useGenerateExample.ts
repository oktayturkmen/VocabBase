import { useMutation } from '@tanstack/react-query';

import { getAIService } from '@/services/ai';

type GenerateExampleArgs = {
  word: string;
  meaning: string;
};

export function useGenerateExample() {
  return useMutation({
    mutationFn: async ({ word, meaning }: GenerateExampleArgs) => {
      const aiService = getAIService();
      return aiService.generateExampleSentence(word, meaning);
    },
  });
}
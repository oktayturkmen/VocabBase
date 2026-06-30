import { z } from 'zod';

export const wordFormSchema = z.object({
  word: z.string().trim().min(1, 'Word is required'),
  meaning: z.string().trim().min(1, 'Meaning is required'),
  example: z.string().trim(),
  pronunciation: z.string().trim(),
});

export type WordFormValues = z.infer<typeof wordFormSchema>;

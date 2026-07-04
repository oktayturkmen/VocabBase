import { z } from 'zod';

export const wordFormSchema = z.object({
  word: z.string().trim().min(1, 'Kelime alanı zorunludur'),
  meaning: z.string().trim().min(1, 'Anlam alanı zorunludur'),
  example: z.string().trim(),
  pronunciation: z.string().trim(),
});

export type WordFormValues = z.infer<typeof wordFormSchema>;

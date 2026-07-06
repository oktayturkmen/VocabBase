import { z } from 'zod';

export const BackupWordSchema = z.object({
  id: z.number(),
  word: z.string(),
  meaning: z.string(),
  example: z.string().nullable(),
  pronunciation: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const BackupListSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const BackupWordListSchema = z.object({
  id: z.number(),
  word_id: z.number(),
  list_id: z.number(),
  created_at: z.number(),
});

export const BackupReviewSchema = z.object({
  id: z.number(),
  word_id: z.number(),
  ease_factor: z.number(),
  interval_days: z.number(),
  repetitions: z.number(),
  next_review_at: z.number(),
  last_reviewed_at: z.number().nullable(),
});

export const BackupStatisticSchema = z.object({
  id: z.number(),
  date: z.string(),
  words_learned: z.number(),
  words_reviewed: z.number(),
  quiz_correct: z.number(),
  quiz_incorrect: z.number(),
  time_spent_seconds: z.number(),
});

export const BackupAiExampleCacheSchema = z.object({
  id: z.number(),
  word: z.string(),
  example: z.string(),
  created_at: z.number(),
});

export const BackupDataSchema = z.object({
  version: z.number(),
  exported_at: z.number(),
  words: z.array(BackupWordSchema),
  lists: z.array(BackupListSchema),
  word_lists: z.array(BackupWordListSchema),
  reviews: z.array(BackupReviewSchema),
  statistics: z.array(BackupStatisticSchema),
  ai_example_cache: z.array(BackupAiExampleCacheSchema),
});

export type BackupData = z.infer<typeof BackupDataSchema>;
export type BackupWord = z.infer<typeof BackupWordSchema>;
export type BackupList = z.infer<typeof BackupListSchema>;
export type BackupWordList = z.infer<typeof BackupWordListSchema>;
export type BackupReview = z.infer<typeof BackupReviewSchema>;
export type BackupStatistic = z.infer<typeof BackupStatisticSchema>;
export type BackupAiExampleCache = z.infer<typeof BackupAiExampleCacheSchema>;

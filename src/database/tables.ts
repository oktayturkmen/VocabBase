export const TABLES = {
  WORDS: 'words',
  LISTS: 'lists',
  WORD_LISTS: 'word_lists',
  REVIEWS: 'reviews',
  STATISTICS: 'statistics',
  AI_EXAMPLE_CACHE: 'ai_example_cache',
  INSTALLED_PACKAGES: 'installed_packages',
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];

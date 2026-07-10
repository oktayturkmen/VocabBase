import type { Word, WordRow } from '@/types/word';

export function mapRowToWord(row: WordRow): Word {
  return {
    id: row.id,
    word: row.word,
    meaning: row.meaning,
    example: row.example,
    pronunciation: row.pronunciation,
    packageName: row.package_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

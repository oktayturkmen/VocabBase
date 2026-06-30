import type { Word } from '@/types/word';

import type { WordFormValues } from '../schemas/word-form.schema';

export function mapWordToFormValues(word: Word): WordFormValues {
  return {
    word: word.word,
    meaning: word.meaning,
    example: word.example ?? '',
    pronunciation: word.pronunciation ?? '',
  };
}

export function mapFormValuesToInput(values: WordFormValues) {
  return {
    word: values.word,
    meaning: values.meaning,
    example: values.example.trim() || null,
    pronunciation: values.pronunciation.trim() || null,
  };
}

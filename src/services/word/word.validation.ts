import type { CreateWordInput, UpdateWordInput } from '@/types/word';

export class WordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WordValidationError';
  }
}

const WORD_REQUIRED = 'Kelime alanı zorunludur';
const MEANING_REQUIRED = 'Anlam alanı zorunludur';
const AT_LEAST_ONE_FIELD = 'En az bir alan güncellenmelidir';

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function validateCreateWordInput(input: CreateWordInput): CreateWordInput {
  const word = input.word.trim();
  const meaning = input.meaning.trim();

  if (!word) {
    throw new WordValidationError(WORD_REQUIRED);
  }

  if (!meaning) {
    throw new WordValidationError(MEANING_REQUIRED);
  }

  return {
    word,
    meaning,
    example: normalizeOptionalText(input.example),
    pronunciation: normalizeOptionalText(input.pronunciation),
  };
}

export function validateUpdateWordInput(input: UpdateWordInput): UpdateWordInput {
  const validatedInput: UpdateWordInput = {};

  if (input.word !== undefined) {
    const word = input.word.trim();

    if (!word) {
      throw new WordValidationError(WORD_REQUIRED);
    }

    validatedInput.word = word;
  }

  if (input.meaning !== undefined) {
    const meaning = input.meaning.trim();

    if (!meaning) {
      throw new WordValidationError(MEANING_REQUIRED);
    }

    validatedInput.meaning = meaning;
  }

  if (input.example !== undefined) {
    validatedInput.example = normalizeOptionalText(input.example);
  }

  if (input.pronunciation !== undefined) {
    validatedInput.pronunciation = normalizeOptionalText(input.pronunciation);
  }

  if (Object.keys(validatedInput).length === 0) {
    throw new WordValidationError(AT_LEAST_ONE_FIELD);
  }

  return validatedInput;
}

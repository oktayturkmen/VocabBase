import type { CreateWordInput, UpdateWordInput } from '@/types/word';

export class WordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WordValidationError';
  }
}

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
    throw new WordValidationError('Word is required');
  }

  if (!meaning) {
    throw new WordValidationError('Meaning is required');
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
      throw new WordValidationError('Word is required');
    }

    validatedInput.word = word;
  }

  if (input.meaning !== undefined) {
    const meaning = input.meaning.trim();

    if (!meaning) {
      throw new WordValidationError('Meaning is required');
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
    throw new WordValidationError('At least one field is required to update');
  }

  return validatedInput;
}

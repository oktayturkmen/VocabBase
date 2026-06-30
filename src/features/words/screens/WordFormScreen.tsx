import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { Button, EmptyState, Loading } from '@/components';

import { WordForm } from '../components/WordForm';
import { useWordForm } from '../hooks/useWordForm';
import type { WordFormValues } from '../schemas/word-form.schema';
import { mapWordToFormValues } from '../utils/word-form.utils';

type WordFormScreenProps = {
  wordId?: number;
};

export default function WordFormScreen({ wordId }: WordFormScreenProps) {
  const router = useRouter();
  const {
    isEditMode,
    selectedWord,
    selectedListIds,
    toggleListSelection,
    isLoading,
    error,
    submit,
  } = useWordForm(wordId);

  const defaultValues = useMemo(
    () => (selectedWord ? mapWordToFormValues(selectedWord) : undefined),
    [selectedWord],
  );

  const handleSubmit = useCallback(
    async (values: WordFormValues, listIds: number[]) => {
      await submit(values, listIds);
      router.back();
    },
    [router, submit],
  );

  if (isEditMode && isLoading && !selectedWord) {
    return <Loading message="Kelime yükleniyor..." fullScreen />;
  }

  if (isEditMode && !isLoading && !selectedWord) {
    return (
      <EmptyState
        className="flex-1"
        title="Kelime bulunamadı"
        description="Bu kelime silinmiş olabilir."
        action={<Button title="Geri dön" variant="outline" onPress={() => router.back()} />}
      />
    );
  }

  return (
    <WordForm
      defaultValues={defaultValues}
      selectedListIds={selectedListIds}
      onToggleListSelection={toggleListSelection}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? 'Değişiklikleri Kaydet' : 'Kelime Ekle'}
      error={error}
    />
  );
}

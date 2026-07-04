import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

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
    deleteWord,
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

  const handleDelete = useCallback(() => {
    if (!selectedWord) {
      return;
    }

    Alert.alert(
      'Kelimeyi Sil',
      `"${selectedWord.word}" kelimesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            void deleteWord()
              .then((isDeleted) => {
                if (isDeleted) {
                  router.back();
                }
              })
              .catch((deleteError: unknown) => {
                const message =
                  deleteError instanceof Error
                    ? deleteError.message
                    : 'Kelime silinirken bir hata oluştu';
                Alert.alert('Hata', message);
              });
          },
        },
      ],
    );
  }, [deleteWord, router, selectedWord]);

  if (isEditMode && isLoading && !selectedWord) {
    return <Loading message="Kelime yükleniyor..." fullScreen />;
  }

  if (isEditMode && !isLoading && !selectedWord) {
    return (
      <EmptyState
        className="flex-1"
        title="Kelime bulunamadı"
        description="Bu kelime silinmiş olabilir."
        action={<Button title="Geri Dön" variant="outline" onPress={() => router.back()} />}
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
      onDelete={isEditMode ? handleDelete : undefined}
    />
  );
}
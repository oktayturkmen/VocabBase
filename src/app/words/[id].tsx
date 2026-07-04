import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';

import { Button, EmptyState } from '@/components';
import WordFormScreen from '@/features/words/screens/WordFormScreen';

export default function EditWordScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const wordId = useMemo(() => {
    if (!id) {
      return undefined;
    }

    const parsedId = Number(id);
    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : undefined;
  }, [id]);

  if (wordId === undefined) {
    return (
      <EmptyState
        className="flex-1"
        title="Geçersiz Kelime"
        description="Seçilen kelime açılamadı."
        action={<Button title="Geri Dön" variant="outline" onPress={() => router.back()} />}
      />
    );
  }

  return <WordFormScreen wordId={wordId} />;
}

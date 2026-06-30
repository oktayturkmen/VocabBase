import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { Button, EmptyState, Loading } from '@/components';
import type { Word } from '@/types/word';

import { WordListItem } from '../components/WordListItem';
import { useWordList } from '../hooks/useWordList';

export default function WordListScreen() {
  const router = useRouter();
  const { words, isLoading, error, refetch, clearError } = useWordList();

  const handleWordPress = useCallback(
    (word: Word) => {
      router.push(`/words/${word.id}`);
    },
    [router],
  );

  const handleAddWord = useCallback(() => {
    router.push('/words/new');
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: Word }) => <WordListItem word={item} onPress={handleWordPress} />,
    [handleWordPress],
  );

  const handleRetry = useCallback(() => {
    clearError();
    void refetch();
  }, [clearError, refetch]);

  if (isLoading && words.length === 0) {
    return <Loading message="Kelimeler yükleniyor..." fullScreen />;
  }

  if (error && words.length === 0) {
    return (
      <EmptyState
        className="flex-1"
        title="Bir hata oluştu"
        description={error}
        action={<Button title="Tekrar dene" variant="outline" onPress={handleRetry} />}
      />
    );
  }

  if (!isLoading && words.length === 0) {
    return (
      <EmptyState
        className="flex-1"
        title="Henüz kelime yok"
        description="Kelime listeniz boş. Başlamak için kelimeler ekleyin."
        action={<Button title="Kelime Ekle" onPress={handleAddWord} />}
      />
    );
  }

  return (
    <View className="flex-1 bg-background">
      {error ? (
        <View className="mx-md mt-sm rounded-lg border border-error/20 bg-error/10 p-sm">
          <Text className="text-sm text-error">{error}</Text>
          <Button
            title="Kapat"
            variant="ghost"
            size="sm"
            className="mt-sm"
            onPress={clearError}
          />
        </View>
      ) : null}

      <FlashList
        data={words}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingVertical: 16 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refetch()} />}
      />
    </View>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EmptyState, Loading } from '@/components';
import { useListStore } from '@/store/list.store';
import { useWordStore } from '@/store';
import { useTheme } from '@/theme/useTheme';
import type { Word } from '@/types/word';

import { WordListItem } from '../components/WordListItem';
import { useWordList } from '../hooks/useWordList';

export default function WordListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // Route params: listId 'all' ise tüm kelimeler, sayı ise belirli liste
  const params = useLocalSearchParams<{ listId?: string }>();
  const listIdParam = params.listId;
  const listId: number | 'all' | undefined =
    listIdParam === 'all' ? 'all' : listIdParam ? Number(listIdParam) : undefined;

  const { words, isLoading, error, refetch, clearError } = useWordList(listId);
  const deleteWords = useWordStore((state) => state.deleteWords);
  const { lists } = useListStore();

  // Başlık belirleme: "Tüm Kelimeler" veya liste adı
  const screenTitle = useMemo(() => {
    if (listId === 'all' || listId === undefined) {
      return 'Tüm Kelimeler';
    }
    const foundList = lists.find((l) => l.id === listId);
    return foundList?.name ?? 'Kelimelerim';
  }, [listId, lists]);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWords = useMemo(() => {
    if (!searchQuery.trim()) {
      return words;
    }
    const query = searchQuery.toLowerCase();
    return words.filter(
      (word) =>
        word.word.toLowerCase().includes(query) ||
        word.meaning.toLowerCase().includes(query),
    );
  }, [words, searchQuery]);

  const handleWordPress = useCallback(
    (word: Word) => {
      router.push(`/words/${word.id}`);
    },
    [router],
  );

  const handleAddWord = useCallback(() => {
    router.push('/words/new');
  }, [router]);

  const handleRetry = useCallback(() => {
    clearError();
    void refetch();
  }, [clearError, refetch]);

  const handleEnterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
    setSelectedWordIds([]);
  }, []);

  const handleExitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedWordIds([]);
  }, []);

  const handleToggleSelect = useCallback((word: Word) => {
    setSelectedWordIds((currentIds) =>
      currentIds.includes(word.id)
        ? currentIds.filter((id) => id !== word.id)
        : [...currentIds, word.id],
    );
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedWordIds.length === 0) {
      return;
    }

    Alert.alert(
      'Kelimeleri Sil',
      `${selectedWordIds.length} kelimeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            void deleteWords(selectedWordIds)
              .then(() => {
                handleExitSelectionMode();
              })
              .catch((deleteError: unknown) => {
                const message =
                  deleteError instanceof Error
                    ? deleteError.message
                    : 'Kelimeler silinirken bir hata oluştu';
                Alert.alert('Hata', message);
              });
          },
        },
      ],
    );
  }, [deleteWords, handleExitSelectionMode, selectedWordIds]);

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
      <View className="flex-1 bg-background">
        <View
          className="flex-row items-center px-md pt-md pb-sm"
          style={{ paddingTop: insets.top + 16 }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Geri dön"
          >
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text className="ml-3 text-2xl font-bold text-foreground">{screenTitle}</Text>
        </View>
        <EmptyState
          className="flex-1"
          title="Henüz kelime yok"
          description="Kelime listeniz boş. Başlamak için kelimeler ekleyin."
          action={<Button title="Kelime Ekle" onPress={handleAddWord} />}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Minimalist Header */}
      <View
        className="flex-row items-center justify-between px-md pt-md pb-sm"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Geri dön"
          >
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text className="ml-3 text-2xl font-bold text-foreground">
            {isSelectionMode ? `${selectedWordIds.length} seçili` : screenTitle}
          </Text>
        </View>
        {isSelectionMode ? (
          <Pressable onPress={handleExitSelectionMode} hitSlop={12}>
            <Text className="text-sm text-muted-foreground">İptal</Text>
          </Pressable>
        ) : (
          <Pressable onPress={handleEnterSelectionMode} hitSlop={12}>
            <Text className="text-sm text-muted-foreground">Seç</Text>
          </Pressable>
        )}
      </View>

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

      {/* Search Bar */}
      {!isSelectionMode ? (
        <View className="mx-md my-3">
          <View className="flex-row items-center bg-muted rounded-xl px-4 py-2.5">
            <Text className="text-muted-foreground mr-2">🔍</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Kelime veya anlam ara..."
              placeholderTextColor={colors.mutedForeground}
              className="flex-1 text-base text-foreground"
              autoCorrect={false}
            />
            {searchQuery.length > 0 ? (
              <Pressable
                onPress={() => setSearchQuery('')}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Aramayı temizle"
              >
                <Text className="text-muted-foreground text-lg">✕</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: isSelectionMode ? 80 : insets.bottom + 24, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refetch()} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredWords.length > 0 ? (
          filteredWords.map((word) => (
            <WordListItem
              key={word.id}
              word={word}
              onPress={handleWordPress}
              isSelectionMode={isSelectionMode}
              isSelected={selectedWordIds.includes(word.id)}
              onToggleSelect={handleToggleSelect}
            />
          ))
        ) : (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-base text-muted-foreground">Aradığınız kelime bulunamadı 🔍</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Bar — Bulk Delete Action */}
      {isSelectionMode ? (
        <View
          className="absolute bottom-0 left-0 right-0 border-t border-border bg-card px-md py-md"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <Pressable
            onPress={handleBulkDelete}
            disabled={selectedWordIds.length === 0}
            className={`py-sm rounded-lg items-center ${
              selectedWordIds.length === 0 ? 'bg-muted' : 'bg-error'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                selectedWordIds.length === 0 ? 'text-muted-foreground' : 'text-primary-foreground'
              }`}
            >
              Seçilenleri Sil ({selectedWordIds.length})
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, Input, Loading } from '@/components';
import type { ListWithWordCount } from '@/services/list';
import { getWordListService } from '@/services/word-list';
import { useListStore } from '@/store/list.store';
import { useWordStore } from '@/store/word.store';
import type { Word } from '@/types/word';

type ListCardProps = {
  list: ListWithWordCount;
  onDelete: (id: number) => void;
  onEditWords: (list: ListWithWordCount) => void;
};

function ListCard({ list, onDelete, onEditWords }: ListCardProps) {
  return (
    <Card
      className="mb-sm border border-border bg-card p-md"
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground mb-xs">{list.name}</Text>
          {list.description ? (
            <Text className="text-sm text-muted-foreground mb-xs">{list.description}</Text>
          ) : null}
          <Text className="text-xs font-medium text-muted-foreground">
            {list.wordCount} kelime
          </Text>
        </View>
        <View className="flex-row items-center gap-sm ml-sm">
          <Pressable
            onPress={() => onEditWords(list)}
            accessibilityRole="button"
            accessibilityLabel={`${list.name} listesinin kelimelerini düzenle`}
            className="rounded-md bg-primary/10 px-sm py-xs active:bg-primary/20"
            hitSlop={8}
          >
            <Text className="text-xs font-semibold text-primary">Düzenle</Text>
          </Pressable>
          <Pressable onPress={() => onDelete(list.id)} hitSlop={8}>
            <Text className="text-error text-sm font-semibold">Sil</Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

type EditWordsModalProps = {
  visible: boolean;
  list: ListWithWordCount | null;
  onClose: () => void;
  onSaved: () => void;
};

function EditWordsModal({ visible, list, onClose, onSaved }: EditWordsModalProps) {
  const insets = useSafeAreaInsets();
  const { words, isLoading: wordsLoading, fetchWords } = useWordStore();
  const { fetchLists } = useListStore();

  // `key` prop ile her liste seçiminde component yeniden mount edildiği için
  // initial state doğrudan kurulur; effect içinde senkron setState'e gerek kalmaz.
  const [selectedWordIds, setSelectedWordIds] = useState<Set<number>>(new Set());
  const [initialWordIds, setInitialWordIds] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

  useEffect(() => {
    if (!visible || !list) {
      return;
    }

    let cancelled = false;
    void fetchWords();

    (async () => {
      try {
        const service = await getWordListService();
        const assignedWordIds = await service.getWordsForList(list.id);
        if (cancelled) {
          return;
        }
        const assignedSet = new Set(assignedWordIds);
        setSelectedWordIds(assignedSet);
        setInitialWordIds(assignedSet);
      } catch (error) {
        Alert.alert(
          'Hata',
          error instanceof Error ? error.message : 'Liste kelimeleri yüklenemedi.',
        );
      } finally {
        if (!cancelled) {
          setIsLoadingAssignments(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, list, fetchWords]);

  const toggleWord = useCallback((wordId: number) => {
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!list) return;

    setIsSaving(true);
    try {
      const service = await getWordListService();
      await service.setWordsForList(list.id, Array.from(selectedWordIds));
      await fetchLists();
      onSaved();
    } catch (error) {
      Alert.alert(
        'Kaydetme Hatası',
        error instanceof Error ? error.message : 'Kelimeler listeye atanamadı.',
      );
    } finally {
      setIsSaving(false);
    }
  }, [list, selectedWordIds, fetchLists, onSaved]);

  const handleClose = useCallback(() => {
    if (isSaving) return;
    onClose();
  }, [isSaving, onClose]);

  const hasChanges = selectedWordIds.size !== initialWordIds.size ||
    Array.from(selectedWordIds).some((id) => !initialWordIds.has(id));

  if (!list) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/50">
        <View
          className="mt-auto bg-background rounded-t-3xl"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {/* Modal Header */}
          <View className="px-md pt-md pb-sm border-b border-border">
            <View className="flex-row items-center justify-between mb-xs">
              <Text className="text-xl font-bold text-foreground">Kelimeleri Düzenle</Text>
              <Pressable
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Kapat"
                hitSlop={12}
                disabled={isSaving}
              >
                <Text className="text-2xl text-muted-foreground">✕</Text>
              </Pressable>
            </View>
            <Text className="text-sm text-muted-foreground">
              {list.name} — {selectedWordIds.size} kelime seçili
            </Text>
          </View>

          {/* Word List */}
          <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
            <View className="px-md py-sm">
              {wordsLoading || isLoadingAssignments ? (
                <Loading message="Kelimeler yükleniyor..." />
              ) : words.length === 0 ? (
                <View className="py-md items-center">
                  <Text className="text-center text-muted-foreground mb-sm">
                    Henüz kelime yok. Önce kelime ekleyin.
                  </Text>
                </View>
              ) : (
                words.map((word: Word) => {
                  const isSelected = selectedWordIds.has(word.id);
                  return (
                    <Pressable
                      key={word.id}
                      onPress={() => toggleWord(word.id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`${word.word} kelimesini ${isSelected ? 'kaldır' : 'ekle'}`}
                      className={`mb-sm flex-row items-center rounded-lg border p-sm ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'
                      }`}
                    >
                      <View
                        className={`mr-sm h-5 w-5 items-center justify-center rounded border-2 ${
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}
                      >
                        {isSelected ? (
                          <Text className="text-xs font-bold text-primary-foreground">✓</Text>
                        ) : null}
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-foreground">{word.word}</Text>
                        <Text className="text-sm text-muted-foreground">{word.meaning}</Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View className="px-md pt-sm border-t border-border">
            <View className="flex-row gap-sm">
              <Button
                title="İptal"
                variant="outline"
                onPress={handleClose}
                disabled={isSaving}
                className="flex-1"
              />
              <Button
                title={isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                onPress={handleSave}
                loading={isSaving}
                disabled={!hasChanges || isSaving}
                className="flex-1"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ListsScreen() {
  const insets = useSafeAreaInsets();
  const {
    lists,
    isLoading,
    error,
    fetchLists,
    createList,
    deleteList,
  } = useListStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [editingList, setEditingList] = useState<ListWithWordCount | null>(null);

  useEffect(() => {
    void fetchLists();
  }, [fetchLists]);

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      Alert.alert('Hata', 'Lütfen bir liste adı girin');
      return;
    }

    await createList(newListName.trim(), newListDescription.trim() || undefined);
    setNewListName('');
    setNewListDescription('');
    setShowCreateForm(false);
  };

  const handleDeleteList = (id: number) => {
    Alert.alert(
      'Listeyi Sil',
      'Bu listeyi silmek istediğinizden emin misiniz? Kelimeler silinmeyecek.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => void deleteList(id),
        },
      ],
    );
  };

  if (isLoading && lists.length === 0) {
    return <Loading message="Listeler yükleniyor..." fullScreen />;
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-md pt-md pb-sm">
          <Text className="text-base text-muted-foreground">
            Kelimelerinizi özel listeler halinde düzenleyin ve öğrenme oturumlarında kullanın.
          </Text>
        </View>

        {error ? (
          <View className="mx-md mb-md">
            <Text className="text-sm text-error text-center mb-sm">{error}</Text>
            <Button title="Tekrar Dene" variant="outline" onPress={() => void fetchLists()} />
          </View>
        ) : null}

        <View className="px-md mb-md">
          <Button
            title={showCreateForm ? 'İptal' : 'Yeni Liste Oluştur'}
            onPress={() => setShowCreateForm(!showCreateForm)}
            variant={showCreateForm ? 'outline' : 'primary'}
          />
        </View>

        {showCreateForm ? (
          <Card className="mx-md mb-md border border-border bg-card p-md">
            <Text className="text-lg font-bold text-foreground mb-md">Yeni Liste Oluştur</Text>
            <Input
              containerClassName="mb-sm"
              placeholder="Liste adı"
              value={newListName}
              onChangeText={setNewListName}
            />
            <Input
              containerClassName="mb-md"
              placeholder="Açıklama (isteğe bağlı)"
              value={newListDescription}
              onChangeText={setNewListDescription}
            />
            <Button title="Liste Oluştur" onPress={handleCreateList} />
          </Card>
        ) : null}

        {lists.length === 0 ? (
          <EmptyState
            className="mx-md mb-md"
            title="Henüz liste yok"
            description="Kelimelerinizi düzenlemek için ilk kelime listenizi oluşturun."
          />
        ) : (
          <View className="px-md">
            {lists.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                onDelete={handleDeleteList}
                onEditWords={(selectedList) => setEditingList(selectedList)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <EditWordsModal
        key={editingList?.id ?? 'none'}
        visible={editingList !== null}
        list={editingList}
        onClose={() => setEditingList(null)}
        onSaved={() => {
          setEditingList(null);
          Alert.alert('Başarılı', 'Liste kelimeleri güncellendi.');
        }}
      />
    </View>
  );
}
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, Input, Loading } from '@/components';
import type { ListWithWordCount } from '@/services/list';
import { useListStore } from '@/store/list.store';

type ListCardProps = {
  list: ListWithWordCount;
  isSelected: boolean;
  onDelete: (id: number) => void;
  onSelect: (id: number) => void;
};

function ListCard({ list, isSelected, onDelete, onSelect }: ListCardProps) {
  return (
    <Card
      className={`mb-sm border p-md ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
    >
      <View className="flex-row justify-between items-start">
        <Pressable className="flex-1" onPress={() => onSelect(list.id)}>
          <View className="flex-row items-center justify-between gap-sm">
            <Text className="flex-1 text-lg font-bold text-foreground mb-xs">{list.name}</Text>
            {isSelected ? (
              <Text className="text-xs font-semibold text-primary">Seçildi</Text>
            ) : null}
          </View>
          {list.description ? (
            <Text className="text-sm text-muted-foreground mb-xs">{list.description}</Text>
          ) : null}
          <Text className="text-xs font-medium text-muted-foreground">
            {list.wordCount} {list.wordCount === 1 ? 'kelime' : 'kelime'}
          </Text>
        </Pressable>
        <Pressable onPress={() => onDelete(list.id)} className="ml-sm">
          <Text className="text-error text-sm font-semibold">Sil</Text>
        </Pressable>
      </View>
    </Card>
  );
}

export default function ListsScreen() {
  const insets = useSafeAreaInsets();
  const {
    lists,
    selectedListId,
    isLoading,
    error,
    fetchLists,
    createList,
    deleteList,
    selectList,
  } = useListStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');

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

  const handleSelectList = (id: number) => {
    const nextSelectedListId = selectedListId === id ? null : id;
    selectList(nextSelectedListId);
    Alert.alert(
      nextSelectedListId ? 'Liste Seçildi' : 'Liste Temizlendi',
      nextSelectedListId
        ? 'Artık Öğren sekmesinden bu listedeki kelimeleri öğrenebilirsiniz.'
        : 'Öğrenme oturumları tüm mevcut kelimeleri kullanacak.',
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
                isSelected={selectedListId === list.id}
                onDelete={handleDeleteList}
                onSelect={handleSelectList}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

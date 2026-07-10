import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Loading } from '@/components';
import type { RoleplayScenario } from '@/features/roleplay/constants/scenarios';
import { getDatabase } from '@/database/client';
import { createWordService } from '@/services/word';
import { usePackageStore } from '@/store/package.store';
import { useTheme } from '@/theme/useTheme';
import { cn } from '@/utils/cn';
import type { Word } from '@/types/word';

const MAX_WORDS = 5;

type WordSelectionTab = 'myWords' | 'allWords';

type WordSelectionSheetProps = {
  visible: boolean;
  scenario: RoleplayScenario | null;
  onClose: () => void;
  onStart: (scenario: RoleplayScenario, targetWords: string[]) => void;
};

/**
 * Kelime seçim bottom sheet'i.
 *
 * İki sekme içerir:
 * - "Listemdekiler": En az bir listeye ait kelimeler
 * - "Tüm Kelimeler": Veritabanındaki tüm kelimeler
 *
 * Kullanıcı 1-5 arası kelime seçer ve "Sohbete Başla" butonuna basar.
 */
export function WordSelectionSheet({
  visible,
  scenario,
  onClose,
  onStart,
}: WordSelectionSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { activePackageName } = usePackageStore();
  const [activeTab, setActiveTab] = useState<WordSelectionTab>('myWords');
  const [myWords, setMyWords] = useState<Word[]>([]);
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);

  const loadWords = useCallback(async () => {
    try {
      const database = await getDatabase();
      const wordService = createWordService(database);
      // setState çağrıları await'ten sonra yapıyoruz ki effect
      // body'sinde senkron setState tetiklenmesin
      setIsLoading(true);
      setSelectedWords([]);
      const [inLists, all] = await Promise.all([
        wordService.getWordsInAnyList(),
        wordService.getAll(),
      ]);
      setMyWords(inLists);
      setAllWords(all);
    } catch (error) {
      console.error('❌ [ROLEPLAY] Kelimeler yüklenemedi:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sheet açıldığında kelimeleri yükle
  useEffect(() => {
    if (!visible) {
      return;
    }

    // loadWords içindeki setState çağrıları await'ten sonra çalıştığı için
    // senkron değil, ancak linter statik analizle bunu tespit edemiyor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadWords();
  }, [visible, loadWords]);

  const handleToggleWord = useCallback((word: string) => {
    setSelectedWords((prev) => {
      if (prev.includes(word)) {
        return prev.filter((w) => w !== word);
      }
      if (prev.length >= MAX_WORDS) {
        return prev;
      }
      return [...prev, word];
    });
  }, []);

  const handleStart = useCallback(() => {
    if (!scenario || selectedWords.length === 0) {
      return;
    }
    onStart(scenario, selectedWords);
  }, [scenario, selectedWords, onStart]);

  const currentWords = activeTab === 'myWords' ? myWords : allWords;
  const isStartDisabled = selectedWords.length === 0;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1">
        {/* Arka plan overlay - tıklayınca kapatır */}
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={onClose}
        />

        {/* İçerik panel - arka plan ile sibling, iç içe değil */}
        <View
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-card shadow-xl"
          style={{ paddingBottom: insets.bottom + 16, maxHeight: '85%' }}
        >
          {/* Grab handle */}
          <View className="self-center mt-sm mb-md h-1 w-10 rounded-full bg-muted-foreground/30" />

          {/* Header */}
          <View className="flex-row items-center justify-between px-md pb-md">
            <View className="flex-1">
              <Text className="text-lg font-bold text-foreground">
                {scenario?.titleTr ?? 'Senaryo'}
              </Text>
              <Text className="mt-xs text-xs text-muted-foreground">
                Pratik yapmak için 1-{MAX_WORDS} kelime seç
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full bg-muted"
            >
              <Ionicons name="close" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Sekmeler */}
          <View className="flex-row mx-md mb-md rounded-xl bg-muted p-xs">
            <Pressable
              onPress={() => setActiveTab('myWords')}
              className={cn(
                'flex-1 items-center rounded-lg py-sm',
                activeTab === 'myWords' ? 'bg-background' : '',
              )}
            >
              <Text
                className={cn(
                  'text-sm font-semibold',
                  activeTab === 'myWords' ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                Listemdekiler
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('allWords')}
              className={cn(
                'flex-1 items-center rounded-lg py-sm',
                activeTab === 'allWords' ? 'bg-background' : '',
              )}
            >
              <Text
                className={cn(
                  'text-sm font-semibold',
                  activeTab === 'allWords' ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                Tüm Kelimeler
              </Text>
            </Pressable>
          </View>

          {/* Aktif Paket Bilgisi - Sadece Tüm Kelimeler sekmesinde */}
          {activeTab === 'allWords' && (
            <View className="mx-md mb-md">
              <View className="flex-row items-center rounded-lg bg-muted px-md py-sm">
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text className="ml-sm text-sm text-muted-foreground">
                  Aktif: {activePackageName}
                </Text>
              </View>
            </View>
          )}

          {/* Kelime Listesi */}
          {isLoading ? (
            <View className="py-xl">
              <Loading message="Kelimeler yükleniyor..." />
            </View>
          ) : currentWords.length === 0 ? (
            <View className="py-xl items-center">
              <Ionicons name="folder-open-outline" size={48} color={colors.mutedForeground} />
              <Text className="mt-md text-sm text-muted-foreground">
                {activeTab === 'myWords'
                  ? 'Listelerinizde kelime yok.'
                  : 'Henüz kelime eklenmemiş.'}
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
              style={{ maxHeight: 300 }}
            >
              <View className="flex-row flex-wrap gap-sm">
                {currentWords.map((word) => {
                  const isSelected = selectedWords.includes(word.word);
                  const isMaxReached = selectedWords.length >= MAX_WORDS && !isSelected;

                  return (
                    <TouchableOpacity
                      key={word.id}
                      onPress={() => handleToggleWord(word.word)}
                      disabled={isMaxReached}
                      activeOpacity={0.7}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`${word.word} kelimesini seç`}
                      accessibilityState={{ checked: isSelected, disabled: isMaxReached }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderRadius: 9999,
                        borderWidth: 1,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        backgroundColor: isSelected ? '#06b6d4' : isMaxReached ? undefined : undefined,
                        borderColor: isSelected ? '#06b6d4' : isMaxReached ? undefined : undefined,
                        opacity: isMaxReached ? 0.4 : 1,
                      }}
                    >
                      {isSelected ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : null}
                      <Text
                        style={{
                          marginLeft: 4,
                          fontSize: 14,
                          fontWeight: '500',
                          color: isSelected ? '#fff' : colors.foreground,
                        }}
                      >
                        {word.word}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Seçim Sayacı ve Başlat Butonu */}
          <View className="mt-md px-md">
            <View className="mb-sm flex-row items-center justify-between">
              <Text className="text-xs text-muted-foreground">
                {selectedWords.length}/{MAX_WORDS} kelime seçildi
              </Text>
              {selectedWords.length > 0 ? (
                <Pressable onPress={() => setSelectedWords([])} hitSlop={8}>
                  <Text className="text-xs font-semibold text-cyan-600">Temizle</Text>
                </Pressable>
              ) : null}
            </View>
            <Button
              title="Sohbete Başla"
              size="lg"
              onPress={handleStart}
              disabled={isStartDisabled}
              className="w-full rounded-2xl bg-cyan-500 active:opacity-90"
              textClassName="text-white font-bold text-lg"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Button, Loading } from '@/components';
import type { RoleplayScenario } from '@/features/roleplay/constants/scenarios';
import { getDatabase } from '@/database/client';
import { createWordService } from '@/services/word';
import { usePackageStore } from '@/store/package.store';
import { useTheme } from '@/theme/useTheme';
import { cn } from '@/utils/cn';
import { shuffleArray } from '@/utils/shuffle';
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
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = (tab: WordSelectionTab) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  const handleSelectRandom = () => {
    if (currentWords.length === 0) return;
    const shuffled = shuffleArray(currentWords);
    const selected = shuffled.slice(0, Math.min(3, currentWords.length)).map(w => w.word);
    setSelectedWords(selected);
  };

  const loadWords = useCallback(async (search?: string) => {
    try {
      const database = await getDatabase();
      const wordService = createWordService(database);
      // setState çağrıları await'ten sonra yapıyoruz ki effect
      // body'sinde senkron setState tetiklenmesin
      setIsLoading(true);
      setSelectedWords([]);
      const [inLists, all] = await Promise.all([
        wordService.getWordsInAnyList(),
        search && search.trim().length > 0
          ? wordService.searchWords(search, 100)
          : wordService.getAll(100),
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchQuery('');
    // loadWords içindeki setState çağrıları await'ten sonra çalıştığı için
    // senkron değil, ancak linter statik analizle bunu tespit edemiyor.
    void loadWords();
  }, [visible, loadWords]);

  // "Tüm Kelimeler" sekmesinde arama değiştiğinde DB'den dinamik ara
  useEffect(() => {
    if (!visible || activeTab !== 'allWords') {
      return;
    }
    const trimmed = searchQuery.trim();
    // Boş arama ise tüm kelimeleri (LIMIT 100) yükle
    void loadWords(trimmed || undefined);
  }, [visible, activeTab, searchQuery, loadWords]);

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
  const filteredWords = useMemo(() => {
    // "Tüm Kelimeler" sekmesinde DB'den zaten filtrelenmiş sonuç geliyor,
    // bu yüzden client-side filter sadece "Listemdekiler" için anlamlı.
    if (activeTab === 'allWords') {
      return currentWords;
    }
    if (!searchQuery.trim()) {
      return currentWords;
    }
    const query = searchQuery.toLowerCase();
    return currentWords.filter((w) => w.word.toLowerCase().includes(query));
  }, [currentWords, searchQuery, activeTab]);
  const isStartDisabled = selectedWords.length === 0;

  return (
    <Modal
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View 
        className="flex-1 bg-background"
        style={{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-lg py-md border-b border-border bg-card">
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground">
              {scenario?.titleTr ?? 'Senaryo'}
            </Text>
            <Text className="text-[11px] text-muted-foreground mt-0.5">
              Pratik yapmak için 1-{MAX_WORDS} kelime seç
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
            hitSlop={12}
            className="h-8 w-8 items-center justify-center rounded-full bg-muted/60 active:bg-muted"
          >
            <Ionicons name="close" size={18} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Sekmeler */}
        <View className="flex-row mx-lg my-md rounded-xl bg-muted p-xs">
          <Pressable
            onPress={() => handleTabChange('myWords')}
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
            onPress={() => handleTabChange('allWords')}
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

        {/* Arama ve Rastgele Seçim Satırı */}
        <View className="flex-row items-center gap-sm mx-lg mb-md">
          {/* Arama Kutusu */}
          <View className="flex-1 flex-row items-center rounded-xl bg-card border border-border px-sm py-1">
            <Ionicons name="search" size={16} color={colors.mutedForeground} style={{ marginRight: 6 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Kelime Ara..."
              placeholderTextColor={colors.mutedForeground}
              className="flex-1 text-sm text-foreground py-1"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
          
          {/* Rastgele Seç Butonu */}
          {currentWords.length > 0 && (
            <Pressable
              onPress={handleSelectRandom}
              className="flex-row items-center gap-xs px-md h-[40px] bg-primary/10 border border-primary/20 rounded-xl active:opacity-80"
            >
              <Ionicons name="shuffle" size={14} color={colors.primary} />
              <Text className="text-xs font-semibold text-primary">Rastgele 3</Text>
            </Pressable>
          )}
        </View>

        {/* Aktif Paket Bilgisi - Sadece Tüm Kelimeler sekmesinde */}
        {activeTab === 'allWords' && (
          <View className="mx-lg mb-md">
            <View className="flex-row items-center rounded-xl bg-muted px-md py-sm">
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text className="ml-sm text-sm text-muted-foreground">
                Aktif Paket: {activePackageName}
              </Text>
            </View>
          </View>
        )}

        {/* Kelime Listesi */}
        {isLoading ? (
          <View className="py-xl flex-1 justify-center">
            <Loading message="Kelimeler yükleniyor..." />
          </View>
        ) : currentWords.length === 0 ? (
          <View className="py-xl flex-1 justify-center items-center">
            <Ionicons name="folder-open-outline" size={48} color={colors.mutedForeground} />
            <Text className="mt-md text-sm text-muted-foreground">
              {activeTab === 'myWords'
                ? 'Listelerinizde kelime yok.'
                : 'Henüz kelime eklenmemiş.'}
            </Text>
          </View>
        ) : filteredWords.length === 0 ? (
          <View className="py-xl flex-1 justify-center items-center">
            <Ionicons name="search-outline" size={48} color={colors.mutedForeground} />
            <Text className="mt-md text-sm text-muted-foreground">
              Arama kriterine uygun kelime bulunamadı.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            className="flex-1"
          >
            {filteredWords.length > 100 && (
              <Text className="text-xs text-muted-foreground mb-md italic">
                Çok fazla kelime var. Son eklenen 100 kelime gösteriliyor. Diğer kelimeler için yukarıdaki arama kutusunu kullanabilirsiniz.
              </Text>
            )}
            <View className="flex-row flex-wrap gap-sm">
              {filteredWords.slice(0, 100).map((word) => {
                const isSelected = selectedWords.includes(word.word);
                const isMaxReached = selectedWords.length >= MAX_WORDS && !isSelected;

                return (
                  <TouchableOpacity
                    key={word.id}
                    onPress={() => handleToggleWord(word.word)}
                    disabled={isMaxReached}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderRadius: 9999,
                      borderWidth: isSelected ? 0 : 1,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundColor: isSelected ? undefined : `${colors.primary}0D`,
                      borderColor: isSelected ? 'transparent' : `${colors.primary}33`,
                      opacity: isMaxReached ? 0.4 : 1,
                    }}
                  >
                    {isSelected && (
                      <LinearGradient
                        colors={['#14b8a6', '#0d9488']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 0,
                        }}
                      />
                    )}
                    
                    {isSelected && (
                      <Ionicons 
                        name="checkmark" 
                        size={14} 
                        color="#fff" 
                        style={{ marginRight: 4, zIndex: 1 }} 
                      />
                    )}
                    
                    <Text 
                      style={{ 
                        fontSize: 14, 
                        fontWeight: isSelected ? '600' : '500', 
                        color: isSelected ? '#fff' : colors.foreground,
                        zIndex: 1
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
        <View className="mt-auto px-lg pt-sm">
          <View className="mb-sm flex-row items-center justify-between">
            <Text className="text-xs text-muted-foreground">
              {selectedWords.length}/{MAX_WORDS} kelime seçildi
            </Text>
            {selectedWords.length > 0 ? (
              <Pressable onPress={() => setSelectedWords([])} hitSlop={8}>
                <Text className="text-xs font-semibold text-primary">Temizle</Text>
              </Pressable>
            ) : null}
          </View>
          <Button
            title="Sohbete Başla"
            size="lg"
            onPress={handleStart}
            disabled={isStartDisabled}
            className={cn(
              "w-full rounded-2xl py-4",
              isStartDisabled 
                ? "bg-muted active:opacity-100 opacity-100" 
                : "bg-primary active:opacity-90 opacity-100"
            )}
            textClassName={cn(
              "font-bold text-base",
              isStartDisabled ? "text-muted-foreground" : "text-primary-foreground"
            )}
          />
        </View>
      </View>
    </Modal>
  );
}
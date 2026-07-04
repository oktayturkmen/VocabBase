import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button, EmptyState, FadeIn, Loading } from '@/components';
import { OwlMascot } from '@/components/illustrations/OwlMascot';
import { useTheme } from '@/theme/useTheme';
import { useWordStore } from '@/store/word.store';
import { useListStore } from '@/store/list.store';
import { useStatisticStore } from '@/store/statistic.store';
import type { StatisticRow } from '@/types/statistic';
import type { Word } from '@/types/word';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi Günler';
  return 'İyi Akşamlar';
}

type MotivationalQuote = {
  en: string;
  tr: string;
};

const MOTIVATIONAL_QUOTES: readonly MotivationalQuote[] = [
  {
    en: 'Learning a language is like learning to ride a bicycle.',
    tr: 'Bir dil öğrenmek, bisiklete binmeyi öğrenmek gibidir.',
  },
  {
    en: 'Every word you learn is a step forward.',
    tr: 'Öğrendiğin her kelime, atılan bir adımdır.',
  },
  {
    en: 'Practice makes perfect.',
    tr: 'Pratik mükemmelleştirir.',
  },
  {
    en: 'Consistency is key to success.',
    tr: 'Tutarlılık, başarının anahtarıdır.',
  },
  {
    en: 'Start small, dream big.',
    tr: 'Küçük başla, büyük hayal et.',
  },
];

function getMotivationalQuote(): MotivationalQuote {
  const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
  return MOTIVATIONAL_QUOTES[randomIndex];
}

function formatDate(): string {
  const date = new Date();
  return date.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function calculateStreak(statistics: StatisticRow[]): number {
  if (!statistics || statistics.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const hasActivity = statistics.some(
      (stat) =>
        stat.date === dateStr &&
        (stat.words_learned > 0 || stat.words_reviewed > 0 || stat.quiz_correct > 0),
    );

    if (hasActivity) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (i === 0) {
      // Bugün aktivite yoksa, düne bak
      currentDate.setDate(currentDate.getDate() - 1);
      continue;
    } else {
      break;
    }
  }

  return streak;
}

function getWeeklyActivity(statistics: StatisticRow[]): boolean[] {
  const activity = [false, false, false, false, false, false, false];
  if (!statistics || statistics.length === 0) return activity;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Pazartesi'den başlayarak (0 = Pazartesi, 6 = Pazar)
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(monday);
    checkDate.setDate(monday.getDate() + i);
    const dateStr = checkDate.toISOString().split('T')[0];

    const hasActivity = statistics.some(
      (stat) =>
        stat.date === dateStr &&
        (stat.words_learned > 0 || stat.words_reviewed > 0 || stat.quiz_correct > 0),
    );

    activity[i] = hasActivity;
  }

  return activity;
}

const WEEKDAY_LABELS = ['P', 'S', 'Ç', 'P', 'C', 'C', 'P'];

function RecentWordItem({
  word,
  onPress,
}: {
  word: Word;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${word.word} kelimesini görüntüle`}
      className="flex-row items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800 px-md py-sm active:opacity-70"
    >
      <View className="flex-1">
        <Text className="text-base font-bold text-foreground">{word.word}</Text>
        <Text className="mt-xs text-sm text-muted-foreground">{word.meaning}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { words, isLoading, error, fetchWords, selectedListId, setSelectedListId } = useWordStore();
  const { lists, fetchLists } = useListStore();
  const { recentStatistics, fetchRecentStatistics } = useStatisticStore();

  const [showListModal, setShowListModal] = useState(false);

  const greeting = useMemo(() => getGreeting(), []);
  const formattedDate = useMemo(() => formatDate(), []);
  const motivationalQuote = useMemo(() => getMotivationalQuote(), []);

  useEffect(() => {
    void fetchWords();
    void fetchLists();
    void fetchRecentStatistics(30);
  }, [fetchWords, fetchLists, fetchRecentStatistics]);

  const handleWordPress = useCallback(
    (wordId: number) => {
      router.push(`/words/${wordId}`);
    },
    [router],
  );

  const handleClearFilter = useCallback(() => {
    setSelectedListId(null);
    void fetchWords();
  }, [setSelectedListId, fetchWords]);

  const handleSelectList = useCallback((listId: number) => {
    setSelectedListId(listId);
    void fetchWords(listId);
    setShowListModal(false);
  }, [setSelectedListId, fetchWords]);

  const recentWords = useMemo(() => words.slice(-10).reverse(), [words]);
  const streakCount = useMemo(() => calculateStreak(recentStatistics), [recentStatistics]);
  const weeklyActivity = useMemo(() => getWeeklyActivity(recentStatistics), [recentStatistics]);

  if (isLoading) {
    return <Loading message="Yükleniyor..." fullScreen />;
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-md">
        <Text className="mb-sm text-center text-sm text-error">{error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Üst Bölüm - Karşılama (Soft Panel) */}
        <View className="px-md" style={{ paddingTop: insets.top + 24 }}>
          {/* Selamlama ve Streak - En Üst Satır */}
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-2xl font-bold text-foreground">
                {greeting}! 👋
              </Text>
              <Text className="mt-xs text-sm text-muted-foreground">{formattedDate}</Text>
            </View>
            {/* Günlük Seri (Streak) */}
            <View className="flex-row items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 px-4 py-2 rounded-full">
              <Ionicons name="flame" size={24} color="#f97316" />
              <Text className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {streakCount} Gün
              </Text>
            </View>
          </View>

          {/* Motivasyon Kartı */}
          <FadeIn duration={800} delay={200}>
            <View className="relative overflow-hidden rounded-2xl bg-amber-50 dark:bg-slate-900/30 p-5 shadow-sm">
              {/* Sol üst köşede tırnak ikonu */}
              <Text className="absolute left-md top-0 text-5xl font-serif text-primary/20">
                &ldquo;
              </Text>

              {/* İçerik: Söz ve Baykuş */}
              <View className="flex-row items-center justify-between">
                {/* İngilizce söz */}
                <View className="flex-1 pr-24">
                  <Text className="text-base font-bold italic leading-relaxed text-foreground">
                    {motivationalQuote.en}
                  </Text>
                  {/* Türkçe anlamı */}
                  <Text className="mt-xs text-sm text-muted-foreground">
                    {motivationalQuote.tr}
                  </Text>
                </View>

                {/* Sağ tarafa baykuş maskot */}
                <View className="absolute right-0">
                  <OwlMascot size={110} />
                </View>
              </View>
            </View>
          </FadeIn>

          {/* Haftalık Takip Paneli */}
          <View className="mt-4 bg-white dark:bg-slate-900 rounded-2xl p-md shadow-sm border border-slate-100 dark:border-slate-800">
            <Text className="mb-sm text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Bu Hafta
            </Text>
            <View className="flex-row justify-between">
              {WEEKDAY_LABELS.map((label, index) => (
                <View key={index} className="flex-col items-center gap-1">
                  <View
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      weeklyActivity[index]
                        ? 'bg-primary'
                        : 'bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        weeklyActivity[index]
                          ? 'text-primary-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Alt Bölüm - Son Eklenenler */}
        <View className="px-md pt-md mb-md">
          <View className="rounded-2xl bg-white dark:bg-slate-900 p-md shadow-sm border border-slate-100 dark:border-slate-800">
            <View className="mb-md flex-row items-center justify-between">
              <Text className="text-xl font-bold text-foreground">
                {selectedListId ? (
                  <>
                    {lists.find((l) => l.id === selectedListId)?.name ?? 'Son Eklenen Kelimeler'}{' '}
                    <Text className="text-sm font-normal text-muted-foreground">
                      ({words.length})
                    </Text>
                  </>
                ) : (
                  'Son Eklenen Kelimeler'
                )}
              </Text>
              <View className="flex-row items-center">
                {selectedListId && (
                  <Pressable
                    onPress={handleClearFilter}
                    accessibilityRole="button"
                    accessibilityLabel="Tüm kelimeleri gör"
                    hitSlop={12}
                    className="mr-lg"
                  >
                    <Text className="text-sm text-muted-foreground">Tümünü Gör</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setShowListModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Kelime listeleri"
                  hitSlop={12}
                >
                  <Ionicons name="folder-outline" size={24} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>
            {recentWords.length > 0 ? (
              <View className="gap-sm">
                {recentWords.map((word) => (
                  <RecentWordItem
                    key={word.id}
                    word={word}
                    onPress={() => handleWordPress(word.id)}
                  />
                ))}
                <Button
                  title="Tüm Kelimelerimi Gör"
                  onPress={() => router.push('/words')}
                  variant="ghost"
                  className="mt-sm rounded-xl bg-primary/5 py-sm"
                  textClassName="text-primary font-semibold"
                />
              </View>
            ) : (
              <EmptyState
                className="rounded-xl border border-border bg-muted/30"
                title="Henüz kelime eklenmedi"
                description="İlk kelimenizi ekleyerek öğrenme yolculuğunuzu başlatın."
                action={
                  <Button
                    title="Kelime Ekle"
                    onPress={() => router.push('/words/new')}
                    variant="primary"
                  />
                }
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* FAB Button */}
      <Pressable
        onPress={() => router.push('/words/new')}
        accessibilityRole="button"
        accessibilityLabel="Yeni kelime ekle"
        className="absolute right-6 rounded-full bg-primary p-4 shadow-lg active:opacity-90"
        hitSlop={16}
        style={{ bottom: insets.bottom + 32 }}
      >
        <Text className="text-3xl font-bold text-primary-foreground">+</Text>
      </Pressable>

      {/* List Selection Modal */}
      <Modal
        visible={showListModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowListModal(false)}
      >
        <Pressable className="flex-1 bg-black/50" onPress={() => setShowListModal(false)}>
          <Pressable
            className="mt-auto bg-background rounded-t-3xl p-md"
            style={{ paddingBottom: insets.bottom + 16 }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="mb-md flex-row items-center justify-between">
              <Text className="text-xl font-bold text-foreground">Kelime Listeleri</Text>
              <Pressable
                onPress={() => setShowListModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Kapat"
                hitSlop={12}
              >
                <Text className="text-2xl text-muted-foreground">✕</Text>
              </Pressable>
            </View>
            
            <ScrollView className="max-h-80">
              {lists.length === 0 ? (
                <View className="py-md">
                  <Text className="text-center text-muted-foreground">Henüz liste yok</Text>
                  <Button
                    title="Listeleri Yönet"
                    onPress={() => {
                      setShowListModal(false);
                      router.push('/lists');
                    }}
                    className="mt-sm"
                  />
                </View>
              ) : (
                <>
                  {lists.map((list) => (
                    <Pressable
                      key={list.id}
                      onPress={() => handleSelectList(list.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${list.name} listesini seç`}
                      accessibilityState={{ selected: selectedListId === list.id }}
                      className={`mb-sm rounded-lg border p-md ${
                        selectedListId === list.id ? 'border-primary bg-primary/5' : 'border-border bg-card'
                      }`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-foreground">{list.name}</Text>
                          {list.description && (
                            <Text className="text-sm text-muted-foreground">{list.description}</Text>
                          )}
                          <Text className="text-xs text-muted-foreground">
                            {list.wordCount} kelime
                          </Text>
                        </View>
                        {selectedListId === list.id ? (
                          <Text className="text-xs font-semibold text-primary">Seçili</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  ))}
                  
                  <Button
                    title="Listeleri Yönet"
                    onPress={() => {
                      setShowListModal(false);
                      router.push('/lists');
                    }}
                    className="mt-sm"
                  />
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
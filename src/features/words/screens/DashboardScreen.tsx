import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { FadeIn, Loading } from '@/components';
import { OwlMascot } from '@/components/illustrations/OwlMascot';
import { useTheme } from '@/theme/useTheme';
import { useWordStore } from '@/store/word.store';
import { useListStore } from '@/store/list.store';
import { useStatisticStore } from '@/store/statistic.store';
import { useGamificationStore } from '@/store/gamification.store';
import { usePackageStore } from '@/store/package.store';
import type { StatisticRow } from '@/types/statistic';
import { getLocalDateString } from '@/utils/date';
import { getDatabase } from '@/database/client';
import { TABLES } from '@/database/tables';

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
    const dateStr = getLocalDateString(currentDate);
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
    const dateStr = getLocalDateString(checkDate);

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

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { words, isLoading, fetchWords } = useWordStore();
  const { lists, fetchLists } = useListStore();
  const { recentStatistics, fetchRecentStatistics } = useStatisticStore();
  const { checkAndUnlockBadge, level } = useGamificationStore();
  const { activePackageName } = usePackageStore();

  const dailyBonusAwardedRef = useRef(false);
  const [packageProgress, setPackageProgress] = useState<{
    totalCount: number;
    learnedCount: number;
  } | null>(null);

  const greeting = useMemo(() => getGreeting(), []);
  const formattedDate = useMemo(() => formatDate(), []);
  const motivationalQuote = useMemo(() => getMotivationalQuote(), []);

  useEffect(() => {
    void fetchWords();
    void fetchLists();
    void fetchRecentStatistics(30);
  }, [fetchWords, fetchLists, fetchRecentStatistics]);

  // Fetch active package progress data
  useEffect(() => {
    const fetchPackageProgress = async () => {
      try {
        const database = await getDatabase();
        
        // Get total word count for active package
        const totalResult = await database.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) AS count FROM ${TABLES.WORDS} WHERE package_name = ?`,
          activePackageName
        );
        const totalCount = totalResult?.count ?? 0;

        if (totalCount === 0) {
          setPackageProgress(null);
          return;
        }

        // Get learned word count for active package (words that have at least one review)
        const learnedResult = await database.getFirstAsync<{ count: number }>(
          `SELECT COUNT(DISTINCT ${TABLES.WORDS}.id) AS count 
           FROM ${TABLES.WORDS} 
           INNER JOIN ${TABLES.REVIEWS} ON ${TABLES.WORDS}.id = ${TABLES.REVIEWS}.word_id 
           WHERE ${TABLES.WORDS}.package_name = ?`,
          activePackageName
        );
        const learnedCount = learnedResult?.count ?? 0;

        setPackageProgress({ totalCount, learnedCount });
      } catch (error) {
        console.error('Failed to fetch package progress:', error);
        setPackageProgress(null);
      }
    };

    void fetchPackageProgress();
  }, [activePackageName]);

  // Daily streak bonus XP trigger and badge check
  useEffect(() => {
    if (!dailyBonusAwardedRef.current && recentStatistics.length > 0) {
      const streakCount = calculateStreak(recentStatistics);
      if (streakCount > 0) {
        // Award +50 XP for daily login bonus
        void useGamificationStore.getState().addXp(50);
        dailyBonusAwardedRef.current = true;
      }
      // Check for streak_7 badge
      void checkAndUnlockBadge('streak_7', streakCount >= 7);
    }
  }, [recentStatistics, checkAndUnlockBadge]);

  const handleAllWordsPress = useCallback(() => {
    router.push('/words?listId=all');
  }, [router]);

  const handleListPress = useCallback(
    (listId: number) => {
      router.push(`/words?listId=${listId}`);
    },
    [router],
  );

  const streakCount = useMemo(() => calculateStreak(recentStatistics), [recentStatistics]);
  const weeklyActivity = useMemo(() => getWeeklyActivity(recentStatistics), [recentStatistics]);

  if (isLoading) {
    return <Loading message="Yükleniyor..." fullScreen />;
  }

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Üst Bölüm - Karşılama (Soft Panel) */}
        <View className="px-md" style={{ paddingTop: insets.top + 24 }}>
          {/* Selamlama ve Streak - En Üst Satır */}
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <View className="flex-row items-center gap-2">
                <Text className="text-2xl font-bold text-foreground">
                  {greeting}! 👋
                </Text>
                <View className="bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-full">
                  <Text className="text-xs font-semibold text-primary">Lvl {level}</Text>
                </View>
              </View>
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

        {/* Aktif Paket İlerleme Kartı */}
        {packageProgress && (
          <FadeIn duration={600} delay={300}>
            <View className="mx-md mt-4 bg-white dark:bg-slate-900 rounded-2xl p-md shadow-sm border border-slate-100 dark:border-slate-800">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-base font-semibold text-foreground">
                  🎯 {activePackageName}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {packageProgress.learnedCount} / {packageProgress.totalCount} Kelime
                </Text>
              </View>
              {/* Progress Bar */}
              <View className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{
                    width: `${(packageProgress.learnedCount / packageProgress.totalCount) * 100}%`,
                  }}
                />
              </View>
            </View>
          </FadeIn>
        )}

        {/* Alt Bölüm - Kelime Listelerim (Yatay ScrollView) */}
        <View className="mt-6">
          <View className="flex-row items-center justify-between px-md mb-sm">
            <Text className="text-xl font-bold text-foreground">
              Kelime Listelerim
            </Text>
            <Pressable
              onPress={() => router.push('/lists')}
              accessibilityRole="button"
              accessibilityLabel="Kelime listelerini yönet"
              hitSlop={12}
            >
              <Text className="text-sm font-semibold text-primary">Yönet</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {/* "Tüm Kelimeler" — Sabit Sistem Kartı (vurgulu renk) */}
            <Pressable
              onPress={handleAllWordsPress}
              accessibilityRole="button"
              accessibilityLabel="Tüm kelimeleri gör"
              className="active:opacity-80"
            >
              <View className="w-40 rounded-2xl bg-primary p-4 shadow-md">
                <View className="flex-row items-center justify-between mb-2">
                  <Ionicons name="library-outline" size={22} color={colors.primaryForeground} />
                  <Text className="text-xs font-semibold text-primary-foreground/80">
                    Sistem
                  </Text>
                </View>
                <Text className="text-base font-bold text-primary-foreground">
                  Tüm Kelimeler
                </Text>
                <Text className="mt-xs text-sm text-primary-foreground/80">
                  {words.length} kelime
                </Text>
              </View>
            </Pressable>

            {/* Kullanıcı Listeleri */}
            {lists.map((list) => (
              <Pressable
                key={list.id}
                onPress={() => handleListPress(list.id)}
                accessibilityRole="button"
                accessibilityLabel={`${list.name} listesini aç`}
                className="active:opacity-80"
              >
                <View className="w-40 rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-100 dark:border-slate-800">
                  <View className="flex-row items-center justify-between mb-2">
                    <Ionicons name="folder-outline" size={22} color={colors.mutedForeground} />
                  </View>
                  <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                    {list.name}
                  </Text>
                  <Text className="mt-xs text-sm text-muted-foreground">
                    {list.wordCount} kelime
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* FAB Button — İzole, temiz, tek başına */}
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
    </View>
  );
}
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { FadeIn, Loading } from '@/components';
import { OwlMascot } from '@/components/illustrations/OwlMascot';
import { useTheme } from '@/theme/useTheme';
import { useWordStore } from '@/store/word.store';
import { useListStore } from '@/store/list.store';
import { useStatisticStore } from '@/store/statistic.store';
import {
  useGamificationStore,
  getProgressToNextLevel,
  getXpToNextLevel,
} from '@/store/gamification.store';
import { usePackageStore } from '@/store/package.store';
import { getKeyValueStorage } from '@/services/storage/key-value-storage.service';
import type { StatisticRow } from '@/types/statistic';
import { getLocalDateString } from '@/utils/date';
import { getDatabase } from '@/database/client';
import { TABLES } from '@/database/tables';

// Günlük bonus'un gün içinde tekrar verilmesini önlemek için kullanılan storage.
// Anahtar formatı: daily_bonus_YYYY-MM-DD
const dailyBonusStorage = getKeyValueStorage({ id: 'gamification' });

// ─── Yardımcı Fonksiyonlar ──────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi Günler';
  return 'İyi Akşamlar';
}

function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '☀️';
  if (hour < 18) return '🌤️';
  return '🌙';
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

/**
 * Bugünün haftanın hangi günü olduğunu döndürür.
 * Pazartesi = 0, …, Pazar = 6 (WEEKDAY_LABELS dizisiyle uyumlu).
 */
function getTodayIndex(): number {
  const dayOfWeek = new Date().getDay(); // 0 = Pazar, 1 = Pazartesi, …
  return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
}

const WEEKDAY_LABELS = ['P', 'S', 'Ç', 'P', 'C', 'C', 'P'];

// ─── Alt Bileşenler ─────────────────────────────────────────────────────────

type QuickActionProps = {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
};

function QuickAction({ onPress, icon, iconColor, iconBg, title, subtitle }: QuickActionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      className="flex-1 active:opacity-80"
    >
      <View className="rounded-2xl bg-card p-md border border-border shadow-sm items-center">
        <View className={`mb-sm h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}>
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>
        <Text className="text-sm font-bold text-foreground text-center">{title}</Text>
        <Text className="text-xs text-muted-foreground text-center mt-xs">{subtitle}</Text>
      </View>
    </Pressable>
  );
}



// ─── Ana Bileşen ─────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { words, isLoading, fetchWords } = useWordStore();
  const { lists, fetchLists } = useListStore();
  const { recentStatistics, fetchRecentStatistics } = useStatisticStore();
  const { checkAndUnlockBadge, level, xp } = useGamificationStore();
  const { activePackageName } = usePackageStore();

  const [packageProgress, setPackageProgress] = useState<{
    totalCount: number;
    learnedCount: number;
  } | null>(null);

  const greeting = useMemo(() => getGreeting(), []);
  const greetingEmoji = useMemo(() => getGreetingEmoji(), []);
  const formattedDate = useMemo(() => formatDate(), []);
  const motivationalQuote = useMemo(() => getMotivationalQuote(), []);
  const todayIndex = useMemo(() => getTodayIndex(), []);
  const levelProgress = useMemo(() => getProgressToNextLevel(), [xp, level]);
  const xpToNext = useMemo(() => getXpToNextLevel(), [xp, level]);

  useEffect(() => {
    void fetchWords();
    void fetchLists();
    void fetchRecentStatistics(30);
  }, [fetchWords, fetchLists, fetchRecentStatistics]);

  useEffect(() => {
    const fetchPackageProgress = async () => {
      try {
        const database = await getDatabase();

        const totalResult = await database.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) AS count FROM ${TABLES.WORDS} WHERE package_name = ?`,
          activePackageName,
        );
        const totalCount = totalResult?.count ?? 0;

        if (totalCount === 0) {
          setPackageProgress(null);
          return;
        }

        const learnedResult = await database.getFirstAsync<{ count: number }>(
          `SELECT COUNT(DISTINCT ${TABLES.WORDS}.id) AS count 
           FROM ${TABLES.WORDS} 
           INNER JOIN ${TABLES.REVIEWS} ON ${TABLES.WORDS}.id = ${TABLES.REVIEWS}.word_id 
           WHERE ${TABLES.WORDS}.package_name = ?`,
          activePackageName,
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

  useEffect(() => {
    if (recentStatistics.length > 0) {
      const streakCount = calculateStreak(recentStatistics);
      const todayKey = `daily_bonus_${getLocalDateString()}`;

      // Bugün bonus daha önce verilmiş mi?
      const alreadyAwardedToday = dailyBonusStorage.getString(todayKey) === 'true';

      if (streakCount > 0 && !alreadyAwardedToday) {
        void useGamificationStore.getState().addXp(50);
        dailyBonusStorage.set(todayKey, 'true');
      }
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
  const activeDaysCount = weeklyActivity.filter(Boolean).length;

  const progressPercentage = packageProgress
    ? Math.round((packageProgress.learnedCount / packageProgress.totalCount) * 100)
    : 0;

  if (isLoading) {
    return <Loading message="Yükleniyor..." fullScreen />;
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 42 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Header (Gradient) ─────────────────────────────── */}
        <FadeIn duration={600} delay={0}>
          <LinearGradient
            colors={['#0D9488', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingTop: insets.top + 16,
              paddingBottom: 24,
              paddingHorizontal: 16,
              borderBottomLeftRadius: 28,
              borderBottomRightRadius: 28,
            }}
          >
            <Text className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {formattedDate}
            </Text>

            <View className="flex-row items-center justify-between mt-sm">
              <View className="flex-1">
                <Text className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
                  {greeting}! {greetingEmoji}
                </Text>

                {/* Level Badge — Glassmorphism + Mini XP Progress */}
                <View className="flex-row items-center mt-xs" style={{ gap: 8 }}>
                  <View
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      borderColor: 'rgba(255,255,255,0.3)',
                      borderWidth: 1,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 12,
                    }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: '#FFFFFF' }}>
                      Lvl {level}
                    </Text>
                    <View
                      style={{
                        height: 2,
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        borderRadius: 1,
                        marginTop: 4,
                        width: 48,
                      }}
                    >
                      <View
                        style={{
                          height: 2,
                          width: `${levelProgress}%`,
                          backgroundColor: '#FFFFFF',
                          borderRadius: 1,
                        }}
                      />
                    </View>
                  </View>
                  <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {xpToNext} XP kaldı
                  </Text>
                </View>
              </View>

              {/* Streak Badge — Glassmorphism */}
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderColor: 'rgba(255,255,255,0.25)',
                  borderWidth: 1,
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Ionicons name="flame" size={20} color="#fbbf24" />
                <Text className="text-base font-bold" style={{ color: '#FFFFFF' }}>
                  {streakCount}
                </Text>
                <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  gün
                </Text>
              </View>
            </View>
          </LinearGradient>
        </FadeIn>

        {/* ─── Motivasyon Kartı (KORUNACAK — BORDERLESS SADE TASARIM) ─ */}
        <FadeIn duration={800} delay={100}>
          <View className="px-md mt-md">
            <View className="relative overflow-hidden p-md rounded-2xl bg-primary/5 border-l-4 border-primary/60">
              {/* Sol üst köşede tırnak ikonu */}
              <Text className="absolute left-xs top-[-8px] text-5xl font-serif text-primary/20">
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
                  <OwlMascot size={100} />
                </View>
              </View>
            </View>
          </View>
        </FadeIn>

        {/* ─── Gelişimim Kartı (İstatistik + Aktivite Birleşik) ──────── */}
        <FadeIn duration={600} delay={200}>
          <View className="px-md mt-md">
            <View className="rounded-3xl border border-border bg-card p-md shadow-sm">
              {/* Kart Başlığı */}
              <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-md">
                Gelişimim
              </Text>

              {/* Aktif Paket İlerlemesi (Beyaz Kart İçinde En Üstte) */}
              {packageProgress && (
                <View className="mb-md">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="cube-outline" size={16} color={colors.primary} />
                      <Text className="text-xs font-bold text-foreground">
                        Aktif Paket: <Text className="text-primary">{activePackageName}</Text>
                      </Text>
                    </View>
                    <Text className="text-xs font-bold text-muted-foreground">
                      {packageProgress.learnedCount} / {packageProgress.totalCount} ({progressPercentage}%)
                    </Text>
                  </View>

                  {/* Renkli Progress Bar */}
                  <View className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-primary rounded-full"
                      style={{
                        width: `${progressPercentage}%`,
                      }}
                    />
                  </View>

                  {/* Yatay Bölücü Çizgi */}
                  <View className="border-b border-border mt-md" />
                </View>
              )}

              {/* 3'lü İstatistik Segmenti */}
              <View className="flex-row items-center justify-between px-xs py-sm">
                {/* Kelime */}
                <View className="flex-1 items-center justify-center">
                  <Ionicons name="book" size={18} color="#0D9488" style={{ marginBottom: 4 }} />
                  <Text className="text-base font-bold text-foreground">{words.length}</Text>
                  <Text className="text-[11px] text-muted-foreground mt-0.5">Kelime</Text>
                </View>

                {/* Dikey Divider */}
                <View className="w-[1px] h-8 bg-border" />

                {/* Öğrenilen */}
                <View className="flex-1 items-center justify-center">
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" style={{ marginBottom: 4 }} />
                  <Text className="text-base font-bold text-foreground text-center">
                    {packageProgress?.learnedCount ?? 0}
                  </Text>
                  <Text className="text-[11px] text-muted-foreground mt-0.5">Öğrenilen</Text>
                </View>

                {/* Dikey Divider */}
                <View className="w-[1px] h-8 bg-border" />

                {/* XP */}
                <View className="flex-1 items-center justify-center">
                  <Ionicons name="flash" size={18} color="#CA8A04" style={{ marginBottom: 4 }} />
                  <Text className="text-base font-bold text-foreground">{xp}</Text>
                  <Text className="text-[11px] text-muted-foreground mt-0.5">XP</Text>
                </View>
              </View>

              {/* Yatay Divider */}
              <View className="border-b border-border my-md" />

              {/* Bu Haftaki Aktivite */}
              <View className="flex-row items-center justify-between mb-sm px-xs">
                <Text className="text-xs font-semibold text-muted-foreground">
                  Haftalık Aktivite
                </Text>
                <View className="flex-row items-center gap-1">
                  <Ionicons name="flame" size={12} color="#f97316" />
                  <Text className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                    {activeDaysCount} aktif gün
                  </Text>
                </View>
              </View>

              {/* Haftalık Aktivite Gün Çemberleri */}
              <View className="flex-row justify-between mt-xs px-xs">
                {WEEKDAY_LABELS.map((label, index) => {
                  const isToday = index === todayIndex;
                  const isActive = weeklyActivity[index];
                  return (
                    <View key={index} className="items-center" style={{ gap: 4 }}>
                      {/* Dairesel İndikatör Konteyneri */}
                      <View
                        className={`w-10 h-10 rounded-full items-center justify-center ${
                          isToday ? 'border-[1.5px] border-primary/50' : ''
                        }`}
                      >
                        {isActive ? (
                          <LinearGradient
                            colors={['#0D9488', '#059669']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          </LinearGradient>
                        ) : (
                          <View
                            className={`rounded-full items-center justify-center ${
                              isToday ? 'bg-primary/5' : 'bg-muted/70'
                            }`}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                            }}
                          />
                        )}
                      </View>

                      {/* Gün Etiketi ve Altındaki Nokta */}
                      <View className="items-center h-8 justify-start">
                        <Text
                          className={`text-xs ${
                            isToday
                              ? 'font-bold text-primary'
                              : 'font-semibold text-muted-foreground'
                          }`}
                        >
                          {label}
                        </Text>
                        {isToday && (
                          <View className="w-1.5 h-1.5 rounded-full bg-primary mt-1" />
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </FadeIn>

        {/* ─── Hızlı Erişim (Dikey Grid — KORUNACAK) ───────────────── */}
        <FadeIn duration={600} delay={500}>
          <View className="px-md mt-lg">
            <Text className="text-lg font-bold text-foreground mb-md">Hızlı Erişim</Text>
            <View className="flex-row gap-md">
              <QuickAction
                onPress={() => router.push('/(tabs)/learn')}
                icon="book-outline"
                iconColor="#f59e0b"
                iconBg="bg-amber-100 dark:bg-amber-900/40"
                title="Öğren"
                subtitle="Yeni kelimeler"
              />
              <QuickAction
                onPress={() => router.push('/quiz')}
                icon="trophy-outline"
                iconColor="#0891b2"
                iconBg="bg-cyan-100 dark:bg-cyan-900/40"
                title="Quiz"
                subtitle="Bilgini test et"
              />
              <QuickAction
                onPress={() => router.push('/roleplay')}
                icon="chatbubbles-outline"
                iconColor="#059669"
                iconBg="bg-emerald-100 dark:bg-emerald-900/40"
                title="Sohbet"
                subtitle="AI ile pratik"
              />
            </View>
          </View>
        </FadeIn>

        {/* ─── Kelime Listelerim (KORUNACAK) ────────────────────────── */}
        <View className="mt-xl">
          <View className="flex-row items-center justify-between px-md mb-sm">
            <Text className="text-xl font-bold text-foreground">Kelime Listelerim</Text>
            <View className="flex-row items-center gap-sm">
              <Pressable
                onPress={() => router.push('/words/new')}
                accessibilityRole="button"
                accessibilityLabel="Yeni kelime ekle"
                hitSlop={12}
                className="flex-row items-center gap-xs bg-primary/10 px-3 py-1.5 rounded-full active:opacity-80"
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text className="text-xs font-bold text-primary">Yeni Ekle</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/lists')}
                accessibilityRole="button"
                accessibilityLabel="Kelime listelerini yönet"
                hitSlop={12}
                className="active:opacity-80"
              >
                <Text className="text-sm font-semibold text-primary">Yönet</Text>
              </Pressable>
            </View>
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
                  <Text className="text-xs font-semibold text-primary-foreground/80">Sistem</Text>
                </View>
                <Text className="text-base font-bold text-primary-foreground">Tüm Kelimeler</Text>
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
                <View className="w-40 rounded-2xl bg-card p-4 shadow-sm border border-border">
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
    </View>
  );
}
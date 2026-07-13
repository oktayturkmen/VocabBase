import React, { useEffect, useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { FadeIn, Loading } from '@/components';
import { useTheme } from '@/theme/useTheme';
import { useStatisticStore } from '@/store/statistic.store';
import { useGamificationStore, getProgressToNextLevel } from '@/store/gamification.store';
import { useWordStore } from '@/store/word.store';
import { getLocalDateString } from '@/utils/date';
import type { StatisticRow } from '@/types/statistic';

// ─── Yardımcı Fonksiyonlar ──────────────────────────────────────────────────

function formatTimeSpent(seconds: number): string {
  if (seconds <= 0) return '0 dk';
  if (seconds < 60) return `${seconds} sn`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} sa`;
  return `${hours} sa ${remainingMinutes} dk`;
}

function getWeeklyChartData(statistics: StatisticRow[]): number[] {
  const data = [0, 0, 0, 0, 0, 0, 0];
  if (!statistics || statistics.length === 0) return data;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(monday);
    checkDate.setDate(monday.getDate() + i);
    const dateStr = getLocalDateString(checkDate);

    const stat = statistics.find((s) => s.date === dateStr);
    if (stat) {
      data[i] = stat.words_learned + stat.words_reviewed;
    }
  }

  return data;
}

const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

type BadgeDefinition = {
  id: string;
  title: string;
  conditionText: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const BADGES: readonly BadgeDefinition[] = [
  {
    id: 'streak_7',
    title: '7 Günlük Seri',
    conditionText: '7 gün üst üste çalış',
    icon: 'flame',
    color: '#F97316',
  },
  {
    id: 'words_100',
    title: 'Kelime Ustası',
    conditionText: '100 kelime öğren',
    icon: 'book',
    color: '#0D9488',
  },
  {
    id: 'quiz_master',
    title: 'Sınav Fatihi',
    conditionText: 'Bir sınavı tamamla',
    icon: 'trophy',
    color: '#CA8A04',
  },
];

// ─── Alt Bileşenler ─────────────────────────────────────────────────────────

type MetricCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string | number;
  subtitle?: string;
  iconColor: string;
  iconBg: string;
};

function MetricCard({ icon, title, value, subtitle, iconColor, iconBg }: MetricCardProps) {
  return (
    <View className="flex-1 min-w-[45%] rounded-2xl bg-card p-md border border-border shadow-sm">
      <View className="flex-row items-center gap-2 mb-xs">
        <View className={`h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text className="text-xs font-semibold text-muted-foreground">{title}</Text>
      </View>
      <Text className="text-xl font-bold text-foreground mt-xs">{value}</Text>
      {subtitle ? <Text className="text-xs text-muted-foreground mt-xs">{subtitle}</Text> : null}
    </View>
  );
}

type BadgeColProps = {
  badge: BadgeDefinition;
  isUnlocked: boolean;
};

function BadgeCol({ badge, isUnlocked }: BadgeColProps) {
  return (
    <View
      className="flex-1 items-center p-sm rounded-2xl bg-card border border-border"
      style={!isUnlocked ? { opacity: 0.4 } : undefined}
    >
      {/* Rozet Dairesel İkonu */}
      <View
        className="h-14 w-14 items-center justify-center rounded-full mb-2 relative"
        style={{
          backgroundColor: isUnlocked ? `${badge.color}15` : '#E2E8F0',
          borderWidth: 1,
          borderColor: isUnlocked ? `${badge.color}30` : '#E2E8F0',
        }}
      >
        <Ionicons name={badge.icon} size={28} color={isUnlocked ? badge.color : '#64748B'} />
        {isUnlocked ? (
          <View
            className="absolute bottom-0 right-0 h-4.5 w-4.5 rounded-full items-center justify-center border border-card"
            style={{ backgroundColor: '#16A34A' }}
          >
            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
          </View>
        ) : (
          <View
            className="absolute bottom-0 right-0 h-4.5 w-4.5 rounded-full items-center justify-center border border-card"
            style={{ backgroundColor: '#64748B' }}
          >
            <Ionicons name="lock-closed" size={9} color="#FFFFFF" />
          </View>
        )}
      </View>

      <Text className="text-xs font-bold text-foreground text-center" numberOfLines={1}>
        {badge.title}
      </Text>
      <Text className="text-[10px] text-muted-foreground text-center mt-xs" numberOfLines={2}>
        {badge.conditionText}
      </Text>
    </View>
  );
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  useTheme();

  const { words, fetchWords } = useWordStore();
  const {
    totalStatistics,
    recentStatistics,
    fetchTotalStatistics,
    fetchRecentStatistics,
    isLoading: isStatsLoading,
  } = useStatisticStore();
  const { level, xp, badges } = useGamificationStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const levelProgress = useMemo(() => getProgressToNextLevel(), [xp, level]);
  const nextLevelXp = useMemo(() => level * 100, [level]);

  useEffect(() => {
    void fetchWords();
    void fetchTotalStatistics();
    void fetchRecentStatistics(30);
  }, [fetchWords, fetchTotalStatistics, fetchRecentStatistics]);

  // İstatistik hesaplamaları
  const timeSpentFormatted = useMemo(() => {
    return formatTimeSpent(totalStatistics?.totalTimeSpentSeconds ?? 0);
  }, [totalStatistics]);

  const quizAccuracy = useMemo(() => {
    if (!totalStatistics) return '0%';
    const total = totalStatistics.totalQuizCorrect + totalStatistics.totalQuizIncorrect;
    if (total === 0) return '0%';
    const percentage = Math.round((totalStatistics.totalQuizCorrect / total) * 100);
    return `${percentage}%`;
  }, [totalStatistics]);

  const totalReviews = useMemo(() => {
    return totalStatistics?.totalWordsReviewed ?? 0;
  }, [totalStatistics]);

  const learnedWordsCount = useMemo(() => {
    return totalStatistics?.totalWordsLearned ?? 0;
  }, [totalStatistics]);

  // Grafik verileri
  const weeklyChartData = useMemo(() => getWeeklyChartData(recentStatistics), [recentStatistics]);
  const maxVal = useMemo(() => {
    const max = Math.max(...weeklyChartData);
    return max === 0 ? 1 : max;
  }, [weeklyChartData]);

  if (isStatsLoading) {
    return <Loading message="İstatistikler yükleniyor..." fullScreen />;
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 42 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Header (Ferah Tavan - Düz Beyaz / Minimalist) ──── */}
        <FadeIn duration={600} delay={0}>
          <View
            style={{
              paddingTop: insets.top + 20,
              paddingBottom: 20,
              paddingHorizontal: 20,
            }}
          >
            <View className="flex-row items-center gap-md">
              {/* Dairesel Şık Avatar (Kullanıcı İkonlu) */}
              <View
                style={{
                  height: 60,
                  width: 60,
                  borderRadius: 30,
                  backgroundColor: '#0D948815',
                  borderColor: '#0D948830',
                  borderWidth: 1.5,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="person-outline" size={24} color="#334155" />
              </View>

              <View className="flex-1">
                <Text className="text-xl font-bold text-foreground">Öğrenci Profili</Text>
                <Text className="text-xs text-muted-foreground mt-xs">
                  Gelişiminizi ve başarılarınızı takip edin.
                </Text>
              </View>
            </View>

            {/* Level & XP Kartı (Emerald/Teal Gradient) */}
            <LinearGradient
              colors={['#0D9488', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                marginTop: 20,
                borderRadius: 20,
                padding: 16,
                shadowColor: '#0D9488',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              <View className="flex-row justify-between items-center mb-xs">
                <Text className="text-sm font-bold" style={{ color: '#FFFFFF' }}>
                  Seviye {level}
                </Text>
                <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {xp} / {nextLevelXp} XP
                </Text>
              </View>
              {/* Progress Bar (Beyaz / Yarı Saydam) */}
              <View
                className="h-2.5 w-full rounded-full overflow-hidden"
                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
              >
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${levelProgress}%`,
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </View>
            </LinearGradient>
          </View>
        </FadeIn>

        {/* ─── İstatistik Izgarası (2x2 Grid) ──────────────────────── */}
        <FadeIn duration={600} delay={100}>
          <View className="px-md mt-sm">
            <Text className="text-lg font-bold text-foreground mb-sm">Genel Durum</Text>
            <View className="flex-row flex-wrap gap-sm">
              <MetricCard
                icon="book"
                title="Öğrenilen Kelimeler"
                value={learnedWordsCount}
                subtitle={`Kütüphanede ${words.length} kelime var`}
                iconColor="#0D9488"
                iconBg="bg-teal-100 dark:bg-teal-900/40"
              />
              <MetricCard
                icon="time"
                title="Çalışma Süresi"
                value={timeSpentFormatted}
                iconColor="#3b82f6"
                iconBg="bg-blue-100 dark:bg-blue-900/40"
              />
              <MetricCard
                icon="repeat"
                title="Toplam Tekrar"
                value={totalReviews}
                iconColor="#a855f7"
                iconBg="bg-purple-100 dark:bg-purple-900/40"
              />
              <MetricCard
                icon="checkmark-circle"
                title="Quiz Doğruluğu"
                value={quizAccuracy}
                iconColor="#16A34A"
                iconBg="bg-green-100 dark:bg-green-900/40"
              />
            </View>
          </View>
        </FadeIn>

        {/* ─── Haftalık Aktivite Grafiği (Apple Tarzı Dikey Grafik) ─── */}
        <FadeIn duration={600} delay={200}>
          <View className="px-md mt-lg">
            <Text className="text-lg font-bold text-foreground mb-sm">Haftalık Aktivite</Text>
            <View className="rounded-2xl bg-card p-md border border-border shadow-sm items-center">
              <View className="flex-row justify-between items-end w-full h-[150] px-sm">
                {weeklyChartData.map((val, index) => {
                  const barHeight = val === 0 ? 4 : (val / maxVal) * 110;
                  return (
                    <View key={index} className="items-center" style={{ width: 40 }}>
                      {/* Değer göstergesi */}
                      {val > 0 ? (
                        <Text className="text-[10px] font-bold text-primary mb-xs">{val}</Text>
                      ) : (
                        <Text className="text-[10px] font-bold text-transparent mb-xs">.</Text>
                      )}

                      {/* Bar */}
                      <View className="w-4 rounded-full bg-muted overflow-hidden h-[110] justify-end">
                        {val > 0 ? (
                          <View
                            className="bg-primary w-full rounded-full"
                            style={{ height: barHeight }}
                          />
                        ) : (
                          <View
                            className="bg-muted-foreground/20 w-full rounded-full"
                            style={{ height: barHeight }}
                          />
                        )}
                      </View>

                      {/* Gün etiketleri */}
                      <Text className="text-xs font-semibold text-muted-foreground mt-sm">
                        {WEEKDAY_LABELS[index]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </FadeIn>

        {/* ─── Başarımlar ve Rozetler (3 Sütunlu Izgara) ─────────────── */}
        <FadeIn duration={600} delay={300}>
          <View className="px-md mt-lg">
            <Text className="text-lg font-bold text-foreground mb-sm">Başarımlar</Text>
            <View className="flex-row gap-sm">
              {BADGES.map((badge) => {
                const isUnlocked = badges.includes(badge.id);
                return (
                  <BadgeCol key={badge.id} badge={badge} isUnlocked={isUnlocked} />
                );
              })}
            </View>
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

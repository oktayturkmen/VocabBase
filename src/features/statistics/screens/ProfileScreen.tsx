import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, EmptyState, Loading } from '@/components';
import { useStatisticStore } from '@/store/statistic.store';
import { useLearningStore } from '@/store/learning.store';
import { useTheme, useThemeContext } from '@/theme/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;

type TimePeriod = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<TimePeriod, string> = {
  today: 'Bugün',
  week: 'Hafta',
  month: 'Ay',
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}s ${remainingMinutes}dk`;
  }
  if (minutes === 0 && seconds > 0) {
    return '< 1dk';
  }
  return `${minutes}dk`;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useTheme().colors;
  const { themeMode } = useThemeContext();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');
  const {
    todayStatistic,
    recentStatistics,
    isLoading,
    error,
    fetchTodayStatistic,
    fetchRecentStatistics,
  } = useStatisticStore();
  const { totalWordCount, fetchTotalWordCount } = useLearningStore();

  useEffect(() => {
    void fetchTodayStatistic();
    void fetchTotalWordCount();
  }, [fetchTodayStatistic, fetchTotalWordCount]);

  useEffect(() => {
    if (timePeriod === 'week') {
      void fetchRecentStatistics(7);
    } else if (timePeriod === 'month') {
      void fetchRecentStatistics(30);
    }
  }, [timePeriod, fetchRecentStatistics]);

  const quizAccuracy = useMemo(() => {
    if (!todayStatistic || todayStatistic.quiz_correct + todayStatistic.quiz_incorrect === 0) {
      return 0;
    }
    return Math.round(
      (todayStatistic.quiz_correct /
        (todayStatistic.quiz_correct + todayStatistic.quiz_incorrect)) *
        100,
    );
  }, [todayStatistic]);

  const chartData = useMemo(
    () => ({
      labels: recentStatistics
        .slice()
        .reverse()
        .map((stat) => {
          const date = new Date(stat.date);
          return timePeriod === 'week'
            ? date.toLocaleDateString('tr-TR', { weekday: 'short' })
            : date.getDate().toString();
        }),
      datasets: [
        {
          data: recentStatistics
            .slice()
            .reverse()
            .map((stat) => stat.words_learned + stat.words_reviewed),
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    }),
    [recentStatistics, timePeriod],
  );

  const chartConfig = useMemo(
    () => ({
      backgroundColor: colors.card,
      backgroundGradientFrom: colors.card,
      backgroundGradientTo: colors.card,
      decimalPlaces: 0,
      color: (opacity = 1) =>
        themeMode === 'dark' ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
      labelColor: (opacity = 1) =>
        themeMode === 'dark' ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: colors.primary,
      },
    }),
    [colors.card, colors.primary, themeMode],
  );

  if (isLoading) {
    return <Loading message="İstatistikler yükleniyor..." fullScreen />;
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-md">
        <Text className="mb-sm text-center text-sm text-error">{error}</Text>
      </View>
    );
  }

  if (!todayStatistic && timePeriod === 'today') {
    return (
      <View className="flex-1 bg-background">
        <EmptyState
          className="flex-1 px-md"
          title="Henüz istatistik yok"
          description="Kelime öğrenmeye veya tekrar etmeye başladığınızda ilerlemeniz burada görünecek."
        />
      </View>
    );
  }

  if (timePeriod !== 'today' && recentStatistics.length === 0) {
    return (
      <View className="flex-1 bg-background">
        <EmptyState
          className="flex-1 px-md"
          title="Henüz istatistik yok"
          description="Seçilen dönem için henüz veri bulunmuyor."
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-md pb-sm" style={{ paddingTop: insets.top + 24 }}>
          <Text className="text-2xl font-bold text-foreground mb-xs">İlerlemeniz</Text>
          <Text className="text-base text-slate-400">
            Günlük, haftalık ve aylık öğrenme istatistikleriniz.
          </Text>
        </View>

        <View className="mb-md px-md mt-4">
          <View className="flex-row bg-slate-50 dark:bg-slate-900 rounded-xl p-1">
            {(['today', 'week', 'month'] as TimePeriod[]).map((period) => (
              <Pressable
                key={period}
                onPress={() => setTimePeriod(period)}
                accessibilityRole="button"
                accessibilityLabel={`${PERIOD_LABELS[period]} dönemini seç`}
                accessibilityState={{ selected: timePeriod === period }}
                className={`flex-1 rounded-lg py-2.5 ${
                  timePeriod === period ? 'bg-primary shadow-sm' : 'bg-transparent'
                }`}
              >
                <Text
                  className={`text-center text-sm font-semibold ${
                    timePeriod === period ? 'text-primary-foreground' : 'text-slate-500'
                  }`}
                >
                  {PERIOD_LABELS[period]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {timePeriod === 'today' && todayStatistic ? (
          <>
            {/* Card 1: Learned Words (Combined) */}
            <Card className="mx-md mb-md border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-md shadow-sm rounded-2xl">
              <View className="items-center">
                <Text className="mb-xs text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Öğrenilen Kelimeler
                </Text>
                <Text className="text-3xl font-bold text-foreground">
                  {todayStatistic.words_learned} / {totalWordCount}
                </Text>
              </View>
            </Card>

            {/* Card 2: Time Spent */}
            <Card className="mx-md mb-md border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-md shadow-sm rounded-2xl">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="mb-xs text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Geçen Süre
                  </Text>
                  <Text className="text-2xl font-bold text-foreground">
                    {formatTime(todayStatistic.time_spent_seconds)}
                  </Text>
                </View>
                <Text className="text-4xl">⏱️</Text>
              </View>
            </Card>

            {/* Card 3: Quiz Success (Combined) */}
            <Card className="mx-md mb-md border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-md shadow-sm rounded-2xl">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="mb-xs text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Quiz Başarısı
                  </Text>
                  <Text className="text-3xl font-bold text-foreground">{quizAccuracy}%</Text>
                  <Text className="mt-xs text-sm text-slate-400">
                    {todayStatistic.quiz_correct} Doğru • {todayStatistic.quiz_incorrect} Yanlış
                  </Text>
                </View>
                <Text className="text-4xl ml-md">🎯</Text>
              </View>
            </Card>
          </>
        ) : null}

        {timePeriod !== 'today' && recentStatistics.length > 0 ? (
          <Card className="mx-md mb-md border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-md shadow-sm rounded-2xl">
            <Text className="mb-sm text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Öğrenilen + Tekrar Edilen Kelimeler
            </Text>
            {Platform.OS !== 'web' ? (
              <LineChart
                data={chartData}
                width={CHART_WIDTH}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                }}
              />
            ) : (
              <View className="items-center justify-center py-8">
                <Text className="text-muted-foreground text-sm">Grafik web platformunda gösterilmiyor</Text>
              </View>
            )}
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

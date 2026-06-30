import React, { useEffect, useState } from 'react';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, EmptyState, Loading } from '@/components';
import { useStatisticStore } from '@/store/statistic.store';
import { useTheme, useThemeContext } from '@/theme/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <Card className="flex-1 border border-border bg-card p-md">
      <View className="items-center">
        <Text className="mb-xs text-3xl">{icon}</Text>
        <Text className="mb-xs text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </Text>
        <Text className="text-2xl font-bold text-foreground">{value}</Text>
      </View>
    </Card>
  );
}

type TimePeriod = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<TimePeriod, string> = {
  today: 'Bugün',
  week: 'Hafta',
  month: 'Ay',
};

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

  useEffect(() => {
    void fetchTodayStatistic();
  }, [fetchTodayStatistic]);

  useEffect(() => {
    if (timePeriod === 'week') {
      void fetchRecentStatistics(7);
    } else if (timePeriod === 'month') {
      void fetchRecentStatistics(30);
    }
  }, [timePeriod, fetchRecentStatistics]);

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

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}s ${remainingMinutes}dk`;
    }
    return `${minutes}dk`;
  };

  const quizAccuracy =
    todayStatistic && todayStatistic.quiz_correct + todayStatistic.quiz_incorrect > 0
      ? Math.round(
          (todayStatistic.quiz_correct /
            (todayStatistic.quiz_correct + todayStatistic.quiz_incorrect)) *
            100,
        )
      : 0;

  const chartData = {
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
  };

  const chartConfig = {
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
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-md pt-md pb-sm">
          <Text className="text-2xl font-bold text-foreground mb-xs">İlerlemeniz</Text>
          <Text className="text-base text-muted-foreground">
            Günlük, haftalık ve aylık öğrenme istatistikleriniz.
          </Text>
        </View>

        <View className="mb-md flex-row gap-sm px-md">
          {(['today', 'week', 'month'] as TimePeriod[]).map((period) => (
            <Pressable
              key={period}
              onPress={() => setTimePeriod(period)}
              className={`flex-1 rounded-lg border py-sm ${
                timePeriod === period ? 'border-primary bg-primary' : 'border-border bg-card'
              }`}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  timePeriod === period ? 'text-primary-foreground' : 'text-foreground'
                }`}
              >
                {PERIOD_LABELS[period]}
              </Text>
            </Pressable>
          ))}
        </View>

        {timePeriod === 'today' && todayStatistic ? (
          <>
            <View className="mb-md px-md">
              <View className="flex-row gap-sm">
                <StatCard
                  title="Öğrenilen"
                  value={todayStatistic.words_learned.toString()}
                  icon="📚"
                />
                <StatCard
                  title="Tekrar"
                  value={todayStatistic.words_reviewed.toString()}
                  icon="🔄"
                />
              </View>
            </View>

            <View className="mb-md px-md">
              <View className="flex-row gap-sm">
                <StatCard
                  title="Doğru"
                  value={todayStatistic.quiz_correct.toString()}
                  icon="✅"
                />
                <StatCard title="Yanlış" value={todayStatistic.quiz_incorrect.toString()} icon="❌" />
              </View>
            </View>

            <Card className="mx-md mb-md border border-border bg-card p-md">
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

            {todayStatistic.quiz_correct + todayStatistic.quiz_incorrect > 0 ? (
              <Card className="mx-md mb-md border border-border bg-card p-md">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="mb-xs text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Quiz Başarısı
                    </Text>
                    <Text className="text-2xl font-bold text-foreground">{quizAccuracy}%</Text>
                  </View>
                  <Text className="text-4xl">🎯</Text>
                </View>
              </Card>
            ) : null}
          </>
        ) : null}

        {timePeriod !== 'today' && recentStatistics.length > 0 ? (
          <Card className="mx-md mb-md border border-border bg-card p-md">
            <Text className="mb-sm text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Öğrenilen + Tekrar Edilen Kelimeler
            </Text>
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
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

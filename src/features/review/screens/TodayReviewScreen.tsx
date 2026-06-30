import React, { useCallback } from 'react';import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';

import { Button, Card, EmptyState, Loading, ProgressBar } from '@/components';
import { DueReviewListItem } from '@/features/review/components/DueReviewListItem';
import { useTodayReview } from '@/features/review/hooks/useTodayReview';
import type { ReviewQuality } from '@/types/review';
import { ReviewRating } from '@/types/review';
import { useReviewStore } from '@/store/review.store';
import { useAppSettingsStore } from '@/store/app-settings.store';

const RATING_OPTIONS = [
  { label: 'Tekrar', quality: ReviewRating.AGAIN, className: 'bg-error/15 border-error/40' },
  { label: 'Zor', quality: ReviewRating.HARD, className: 'bg-warning/15 border-warning/40' },
  { label: 'İyi', quality: ReviewRating.GOOD, className: 'bg-primary/15 border-primary/40' },
  { label: 'Kolay', quality: ReviewRating.EASY, className: 'bg-success/15 border-success/40' },
] as const;

function ReviewRatingButtons({ onSelect }: { onSelect: (quality: ReviewQuality) => void }) {
  return (
    <View>
      <Text className="text-sm font-semibold text-muted-foreground text-center mb-sm">
        Ne kadar iyi hatırladınız?
      </Text>
      <View className="flex-row flex-wrap justify-between gap-sm">
        {RATING_OPTIONS.map((option) => (
          <Pressable
            key={option.label}
            onPress={() => onSelect(option.quality)}
            className={['flex-1 min-w-[45%] items-center rounded-xl border py-md', option.className].join(
              ' ',
            )}
          >
            <Text className="text-base font-semibold text-foreground">{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function ActiveReviewSession() {
  const {
    sessionReviews,
    currentIndex,
    isRevealed,
    revealMeaning,
    submitReview,
    advanceReview,
    finishSession,
  } = useReviewStore();

  const { speechSpeed } = useAppSettingsStore();

  const currentReview = sessionReviews[currentIndex];

  const handleSpeak = useCallback(() => {
    if (currentReview) {
      void Speech.speak(currentReview.word.word, { language: 'en-US', rate: speechSpeed });
    }
  }, [currentReview, speechSpeed]);

  const handleRating = useCallback(
    async (quality: ReviewQuality) => {
      if (currentReview) {
        await submitReview(quality);
        advanceReview();
      }
    },
    [currentReview, submitReview, advanceReview],
  );

  if (!currentReview) {
    return <Loading message="Tekrar yükleniyor..." fullScreen />;
  }

  return (
    <View className="flex-1 justify-between p-md bg-background">
      <View className="mt-sm">
        <View className="flex-row justify-between items-center mb-xs">
          <Text className="text-sm font-semibold text-muted-foreground">BUGÜNKÜ TEKRAR</Text>
          <Text className="text-sm font-semibold text-primary">
            {currentIndex + 1} / {sessionReviews.length}
          </Text>
        </View>
        <ProgressBar
          progress={((currentIndex + 1) / sessionReviews.length) * 100}
          className="mt-xs"
        />
      </View>

      <Card className="flex-1 justify-center my-lg border border-border shadow-md p-lg bg-card rounded-2xl">
        <View className="items-center justify-center">
          <View className="items-center mb-md">
            <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-xs">
              Şu kelimenin anlamını hatırlayın:
            </Text>
            <View className="flex-row items-center justify-center">
              <Text className="text-4xl font-extrabold text-foreground tracking-wide mr-sm">
                {currentReview.word.word}
              </Text>
              <Pressable
                onPress={handleSpeak}
                className="bg-primary/10 p-xs rounded-full active:bg-primary/20"
                hitSlop={12}
              >
                <Text className="text-xl">🔊</Text>
              </Pressable>
            </View>
            {currentReview.word.pronunciation ? (
              <Text className="text-base text-muted-foreground mt-xs font-mono">
                {currentReview.word.pronunciation}
              </Text>
            ) : null}
          </View>

          {isRevealed ? (
            <View className="w-full items-center border-t border-border/50 pt-md mt-sm">
              <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-xs">
                Anlamı
              </Text>
              <Text className="text-2xl font-bold text-primary text-center">
                {currentReview.word.meaning}
              </Text>
              {currentReview.word.example ? (
                <Text className="text-base italic text-muted-foreground text-center mt-md px-sm">
                  &quot;{currentReview.word.example}&quot;
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </Card>

      <View className="mb-sm">
        {!isRevealed ? (
          <Button title="Anlamı Göster" onPress={revealMeaning} size="lg" className="w-full" />
        ) : (
          <ReviewRatingButtons onSelect={handleRating} />
        )}
        <Button
          title="Oturumu Sonlandır"
          variant="ghost"
          onPress={finishSession}
          className="mt-xs py-sm"
          textClassName="text-muted-foreground text-sm font-medium"
        />
      </View>
    </View>
  );
}

export function CompletedReviewSession() {
  const { sessionReviews, finishSession } = useReviewStore();

  return (
    <View className="flex-1 justify-center items-center p-md bg-background">
      <View className="bg-success/10 p-xl rounded-full mb-lg">
        <Text className="text-5xl">✅</Text>
      </View>
      <Text className="text-2xl font-bold text-foreground text-center mb-xs">Tekrar Tamamlandı!</Text>
      <Text className="text-base text-muted-foreground text-center mb-lg px-md">
        Bu oturumda {sessionReviews.length}{' '}
        {sessionReviews.length === 1 ? 'kelime' : 'kelime'} tekrar ettiniz.
      </Text>
      <Button title="Tekrara Dön" onPress={finishSession} size="lg" className="w-full" />
    </View>
  );
}

function TodayReviewDashboard() {
  const router = useRouter();
  const { dueReviews, dueCount, isLoading, error, refetch } = useTodayReview();
  const startSession = useReviewStore((state) => state.startSession);
  const isStarting = useReviewStore((state) => state.isLoading);

  if (isLoading && dueReviews.length === 0) {
    return <Loading message="Bugünkü tekrarlar yükleniyor..." fullScreen />;
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View className="items-center pt-lg px-md pb-md">
          <View className="bg-primary/10 p-lg rounded-full mb-md">
            <Text className="text-4xl">🧠</Text>
          </View>
          <Text className="text-2xl font-bold text-foreground text-center mb-xs">
            Bugünkü Tekrar
          </Text>
          <Text className="text-base text-muted-foreground text-center px-md">
            Hafızanızı güçlendirmek için bugün tekrar etmeniz gereken kelimeleri gözden geçirin.
          </Text>
        </View>

        <Card className="mx-md mb-md border border-border bg-card">
          <View className="flex-row justify-between items-center py-xs">
            <Text className="text-base text-foreground font-medium">Bugün tekrar edilecek kelimeler</Text>
            <View className="bg-primary px-sm py-xs rounded-full">
              <Text className="text-sm font-semibold text-primary-foreground">{dueCount}</Text>
            </View>
          </View>
        </Card>

        {error ? (
          <View className="mx-md mb-md">
            <Text className="text-sm text-error text-center mb-sm">{error}</Text>
            <Button title="Tekrar Dene" variant="outline" onPress={() => void refetch()} />
          </View>
        ) : null}

        {dueCount > 0 ? (
          <>
            <Button
              title="Tekrar Oturumunu Başlat"
              onPress={() => void startSession()}
              loading={isStarting}
              size="lg"
              className="mx-md mb-md w-auto shadow-sm"
            />

            <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mx-md mb-sm">
              Tekrar Edilecek Kelimeler
            </Text>

            <View className="mb-md">
              {dueReviews.map((review) => (
                <DueReviewListItem key={review.id} review={review} />
              ))}
            </View>
          </>
        ) : (
          <EmptyState
            className="mx-md mb-md"
            title="Hepsi tamamlandı!"
            description="Bugün tekrar edilecek kelime yok. Harika iş — yarın geri gelin veya yeni kelimeler öğrenin."
            action={
              <Button
                title="Yeni Kelimeler Öğren"
                variant="outline"
                onPress={() => router.push('/(tabs)/learn')}
              />
            }
          />
        )}

        <View className="mx-md mt-lg pt-md border-t border-border">
          <Text className="text-lg font-bold text-foreground mb-xs">Quiz Modları</Text>
          <Text className="text-sm text-muted-foreground mb-md">
            Kelime hazinenizi çoktan seçmeli veya yazma quizleri ile test edin.
          </Text>
          <Button title="Quiz Başlat" onPress={() => router.push('/quiz')} className="w-full" />
        </View>
      </ScrollView>
    </View>
  );
}

export default function TodayReviewScreen() {
  const status = useReviewStore((state) => state.status);

  if (status === 'loading') {
    return <Loading message="Tekrar oturumu hazırlanıyor..." fullScreen />;
  }

  if (status === 'active') {
    return <ActiveReviewSession />;
  }

  if (status === 'completed') {
    return <CompletedReviewSession />;
  }

  return <TodayReviewDashboard />;
}

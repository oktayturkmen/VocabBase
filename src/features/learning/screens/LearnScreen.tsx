import React, { useEffect, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';

import { Button, Card, Loading, ProgressBar } from '@/components';
import { useListStore } from '@/store/list.store';
import { useAppSettingsStore } from '@/store/app-settings.store';
import { useLearningStore } from '@/store/learning.store';

export default function LearnScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    sessionWords,
    currentIndex,
    isFlipped,
    status,
    unlearnedCount,
    isLoading,
    fetchUnlearnedCount,
    startSession,
    flipCard,
    unflipCard,
    markLearned,
    finishSession,
  } = useLearningStore();
  const { lists, selectedListId, fetchLists } = useListStore();
  const { speechSpeed } = useAppSettingsStore();

  const currentWord = sessionWords[currentIndex];
  const selectedList = lists.find((list) => list.id === selectedListId) ?? null;
  const selectedListFilter = selectedListId ?? undefined;

  const handleSpeak = useCallback(
    (text: string) => {
      void Speech.speak(text, {
        language: 'en-US',
        rate: speechSpeed,
      });
    },
    [speechSpeed],
  );

  // Auto-play speech when a new word card appears (front face)
  useEffect(() => {
    if (status === 'active' && currentWord && !isFlipped) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        handleSpeak(currentWord.word);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [status, currentWord, isFlipped, handleSpeak]);

  useEffect(() => {
    void fetchLists();
  }, [fetchLists]);

  useEffect(() => {
    void fetchUnlearnedCount(selectedListFilter);
  }, [fetchUnlearnedCount, selectedListFilter, status]);

  if (isLoading && status === 'loading') {
    return <Loading message="Öğrenme oturumu hazırlanıyor..." fullScreen />;
  }

  // Idle state: Screen explaining the learning session
  if (status === 'idle') {
    return (
      <View className="flex-1 justify-center p-md bg-background" style={{ paddingTop: insets.top + 16 }}>
        <View className="items-center mb-lg">
          <View className="bg-primary/10 p-lg rounded-full mb-md">
            <Text className="text-4xl">📚</Text>
          </View>
          <Text className="text-2xl font-bold text-foreground text-center mb-xs">
            Yeni Kelimeler Öğren
          </Text>
          <Text className="text-base text-muted-foreground text-center px-md">
            Yeni kelimeleri kart çevirerek çalışın: kelimeyi dinleyin, kartı çevirin ve
            anlamı ile örnek cümleyi birlikte görün.
          </Text>
        </View>

        <Card className="mb-lg border border-border bg-card">
          {selectedList ? (
            <View className="border-b border-border pb-sm mb-sm">
              <Text className="text-sm font-semibold text-muted-foreground">Seçilen liste</Text>
              <Text className="text-base font-bold text-foreground">{selectedList.name}</Text>
            </View>
          ) : null}
          <View className="flex-row justify-between items-center py-xs">
            <Text className="text-base text-foreground font-medium">Yeni kelime mevcut</Text>
            <View className="bg-primary px-sm py-xs rounded-full">
              <Text className="text-sm font-semibold text-primary-foreground">
                {unlearnedCount}
              </Text>
            </View>
          </View>
        </Card>

        {unlearnedCount > 0 ? (
          <Button
            title="Öğrenme Oturumunu Başlat"
            onPress={() => void startSession(10, selectedListFilter)}
            size="lg"
            className="w-full shadow-sm"
          />
        ) : (
          <View className="items-center p-md border border-dashed border-border rounded-xl">
            <Text className="text-base text-muted-foreground text-center mb-sm">
              Tüm kelimeler şu an öğrenildi! Öğrenmeye devam etmek için listenize daha fazla kelime ekleyin.
            </Text>
            <Button
              title="Yeni Kelime Ekle"
              variant="outline"
              onPress={() => router.push('/words/new')}
              className="w-full"
            />
          </View>
        )}
      </View>
    );
  }

  // Session completed state
  if (status === 'completed') {
    const wordsLearned = sessionWords.length;
    return (
      <View className="flex-1 justify-center items-center p-md bg-background" style={{ paddingTop: insets.top + 16 }}>
        <View className="bg-success/10 p-xl rounded-full mb-lg">
          <Text className="text-5xl">🎉</Text>
        </View>
        <Text className="text-2xl font-bold text-foreground text-center mb-xs">
          Oturum Tamamlandı!
        </Text>
        <Text className="text-base text-muted-foreground text-center mb-lg px-md">
          Harika iş! Bugün başarıyla {wordsLearned} yeni{' '}
          {wordsLearned === 1 ? 'kelime' : 'kelime'} öğrendiniz.
        </Text>

        <Button title="Bitir" onPress={finishSession} size="lg" className="w-full mb-sm" />
        <Button
          title="Kelime Listesine Git"
          variant="outline"
          onPress={() => {
            finishSession();
            router.push('/');
          }}
          className="w-full"
        />
      </View>
    );
  }

  // Active learning session
  if (!currentWord) {
    return <Loading message="Sonraki kelime yükleniyor..." fullScreen />;
  }

  return (
    <View className="flex-1 justify-between p-md bg-background" style={{ paddingTop: insets.top + 16 }}>
      {/* Top Header & Progress */}
      <View className="mt-sm">
        <View className="flex-row justify-between items-center mb-xs">
          <Text className="text-sm font-semibold text-muted-foreground">ÖĞRENME OTURUMU</Text>
          <Text className="text-sm font-semibold text-primary">
            {currentIndex + 1}. / {sessionWords.length} Kelime
          </Text>
        </View>
        <ProgressBar
          progress={((currentIndex + 1) / sessionWords.length) * 100}
          className="mt-xs"
        />
      </View>

      {/* Main Flashcard Card */}
      <Card className="flex-1 justify-center my-lg border border-border shadow-md p-lg bg-card rounded-2xl">
        <View className="items-center justify-center">
          {/* Front Face: Word */}
          {!isFlipped && (
            <View className="items-center mb-md">
              <View className="flex-row items-center justify-center">
                <Text className="text-4xl font-extrabold text-foreground tracking-wide mr-sm">
                  {currentWord.word}
                </Text>
                <Pressable
                  onPress={() => handleSpeak(currentWord.word)}
                  accessibilityRole="button"
                  accessibilityLabel={`${currentWord.word} kelimesini seslendir`}
                  className="bg-primary/10 p-xs rounded-full active:bg-primary/20"
                  hitSlop={12}
                >
                  <Text className="text-xl">🔊</Text>
                </Pressable>
              </View>
              {currentWord.pronunciation ? (
                <Text className="text-base text-muted-foreground mt-xs font-mono">
                  {currentWord.pronunciation}
                </Text>
              ) : null}
            </View>
          )}

          {/* Back Face: Meaning + Example */}
          {isFlipped && (
            <View className="w-full items-center">
              {/* Meaning */}
              <View className="w-full items-center mb-md">
                <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-xs">
                  Anlamı
                </Text>
                <Text className="text-2xl font-bold text-primary text-center">
                  {currentWord.meaning}
                </Text>
              </View>

              {/* Example */}
              {currentWord.example ? (
                <View className="w-full items-center border-t border-border/50 pt-md mt-sm">
                  <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-xs">
                    Örnek Cümle
                  </Text>
                  <Text className="text-lg italic text-foreground text-center px-sm leading-relaxed">
                    {'"'}
                    {currentWord.example}
                    {'"'}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </Card>

      {/* Bottom Button Actions */}
      <View className="mb-sm">
        {/* Front face: Flip button */}
        {!isFlipped && (
          <Button
            title="Kartı Çevir"
            onPress={flipCard}
            size="lg"
            className="w-full shadow-sm"
          />
        )}

        {/* Back face: Decision buttons */}
        {isFlipped && (
          <View className="flex-row gap-sm">
            <Button
              title="Tekrar Et"
              variant="outline"
              onPress={unflipCard}
              size="lg"
              className="flex-1"
            />
            <Button
              title="Öğrendim"
              onPress={() => void markLearned()}
              size="lg"
              className="flex-1"
            />
          </View>
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
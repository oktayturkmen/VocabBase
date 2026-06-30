import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, EmptyState } from '@/components';
import { useTodayReview } from '@/features/review/hooks/useTodayReview';
import { getSpeechRecognitionService } from '@/services/speech-recognition';
import { getWordService } from '@/services/word';
import { useLearningStore } from '@/store/learning.store';
import { useListStore } from '@/store/list.store';
import { useReviewStore } from '@/store/review.store';
import { useTheme } from '@/theme/useTheme';
import type { Word } from '@/types/word';

type MemoryExerciseMode = 'listening' | 'pronunciation';

const NEW_WORD_SESSION_SIZE = 5;

export function LearnAndQuizHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { dueCount, isLoading, error, refetch } = useTodayReview();
  const startReviewSession = useReviewStore((state) => state.startSession);
  const isStartingReview = useReviewStore((state) => state.isLoading);
  const { unlearnedCount, fetchUnlearnedCount, startSession } = useLearningStore();
  const { lists, selectedListId, fetchLists } = useListStore();
  const [exerciseMode, setExerciseMode] = useState<MemoryExerciseMode | null>(null);
  const [activeExercise, setActiveExercise] = useState<MemoryExerciseMode | null>(null);
  const [exerciseWords, setExerciseWords] = useState<Word[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isLoadingExercise, setIsLoadingExercise] = useState(false);
  const [isListeningLoopActive, setIsListeningLoopActive] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [pronunciationFeedback, setPronunciationFeedback] = useState<string | null>(null);

  const selectedListFilter = selectedListId ?? undefined;
  const currentExerciseWord = exerciseWords[currentExerciseIndex] ?? null;
  const newWordCount = Math.min(NEW_WORD_SESSION_SIZE, unlearnedCount);
  const listeningLoopActiveRef = useRef(false);
  const listeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playListeningPairRef = useRef<(words: Word[], index: number) => void>(() => {});

  useEffect(() => {
    void fetchLists();
  }, [fetchLists]);

  useEffect(() => {
    void fetchUnlearnedCount(selectedListFilter);
  }, [fetchUnlearnedCount, selectedListFilter]);

  const clearListeningTimeout = useCallback(() => {
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
      listeningTimeoutRef.current = null;
    }
  }, []);

  const stopListeningLoop = useCallback(() => {
    listeningLoopActiveRef.current = false;
    clearListeningTimeout();
    setIsListeningLoopActive(false);
    Speech.stop();
  }, [clearListeningTimeout]);

  useEffect(() => {
    playListeningPairRef.current = (words: Word[], index: number) => {
      if (!listeningLoopActiveRef.current || words.length === 0) {
        return;
      }

      const word = words[index];
      setCurrentExerciseIndex(index);

      Speech.speak(word.word, {
        language: 'en-US',
        rate: 0.85,
        onDone: () => {
          if (!listeningLoopActiveRef.current) {
            return;
          }

          Speech.speak(word.meaning, {
            language: 'tr-TR',
            rate: 0.9,
            onDone: () => {
              if (!listeningLoopActiveRef.current) {
                return;
              }

              listeningTimeoutRef.current = setTimeout(() => {
                playListeningPairRef.current(words, (index + 1) % words.length);
              }, 450);
            },
          });
        },
      });
    };
  }, []);

  const startListeningLoop = useCallback(
    (words: Word[]) => {
      stopListeningLoop();
      listeningLoopActiveRef.current = true;
      setIsListeningLoopActive(true);
      playListeningPairRef.current(words, 0);
    },
    [stopListeningLoop],
  );

  const openExerciseSourceModal = useCallback(
    (mode: MemoryExerciseMode) => {
      stopListeningLoop();
      setExerciseMode(mode);
    },
    [stopListeningLoop],
  );

  const closeExerciseSourceModal = useCallback(() => {
    setExerciseMode(null);
  }, []);

  const startExerciseWithSource = useCallback(
    async (listId?: number) => {
      if (!exerciseMode) {
        return;
      }

      setIsLoadingExercise(true);
      setLastTranscript(null);
      setPronunciationFeedback(null);

      try {
        const wordService = await getWordService();
        const words = listId ? await wordService.getByListId(listId) : await wordService.getAll();

        if (words.length === 0) {
          Alert.alert(
            'Kelime bulunamadı',
            listId
              ? 'Bu listede henüz kelime yok. Başka bir liste seçin veya yeni kelime ekleyin.'
              : 'Henüz çalışılacak kelime yok. Önce kelime ekleyin.',
          );
          return;
        }

        setExerciseWords(words);
        setCurrentExerciseIndex(0);
        setActiveExercise(exerciseMode);
        setExerciseMode(null);

        if (exerciseMode === 'listening') {
          startListeningLoop(words);
        }
      } catch (exerciseError) {
        Alert.alert(
          'Egzersiz başlatılamadı',
          exerciseError instanceof Error ? exerciseError.message : 'Bilinmeyen hata oluştu.',
        );
      } finally {
        setIsLoadingExercise(false);
      }
    },
    [exerciseMode, startListeningLoop],
  );

  const closeActiveExercise = useCallback(() => {
    stopListeningLoop();
    setActiveExercise(null);
    setExerciseWords([]);
    setCurrentExerciseIndex(0);
    setLastTranscript(null);
    setPronunciationFeedback(null);
  }, [stopListeningLoop]);

  const goToNextPronunciationWord = useCallback(() => {
    setLastTranscript(null);
    setPronunciationFeedback(null);
    setCurrentExerciseIndex((index) =>
      exerciseWords.length > 0 ? (index + 1) % exerciseWords.length : 0,
    );
  }, [exerciseWords.length]);

  const handlePronunciationCheck = useCallback(async () => {
    if (!currentExerciseWord) {
      return;
    }

    const recognitionService = getSpeechRecognitionService();

    if (!recognitionService.isAvailable()) {
      const setupText = recognitionService
        .getSetupSteps()
        .map((step, index) => `${index + 1}. ${step.title}: ${step.detail}`)
        .join('\n\n');

      Alert.alert('Ses tanıma kurulumu gerekli', setupText);
      return;
    }

    setIsRecognizing(true);
    setPronunciationFeedback(null);

    try {
      const result = await recognitionService.listenOnce();
      setLastTranscript(result.transcript);

      if (recognitionService.isMatch(result.transcript, currentExerciseWord.word)) {
        setPronunciationFeedback('Başarılı! Telaffuz doğru algılandı.');
        Alert.alert('Başarılı', 'Telaffuz doğru algılandı.');
      } else {
        setPronunciationFeedback('Tekrar deneyin. Algılanan ifade hedef kelimeyle eşleşmedi.');
      }
    } catch (recognitionError) {
      setPronunciationFeedback(
        recognitionError instanceof Error ? recognitionError.message : 'Ses tanıma başlatılamadı.',
      );
    } finally {
      setIsRecognizing(false);
    }
  }, [currentExerciseWord]);

  useEffect(() => stopListeningLoop, [stopListeningLoop]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-md pt-md pb-sm">
          <Text className="text-2xl font-bold text-foreground">Öğren</Text>
        </View>

        <View className="px-md mb-lg">
          <View className="flex-row gap-sm">
            <Card className="flex-1 rounded-2xl border border-border bg-card p-sm">
              <View className="mb-md h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Ionicons name="time-outline" size={22} color={colors.primary} />
              </View>
              <Text className="mb-md text-base font-bold text-foreground">
                {dueCount} Kelime Tekrar Et
              </Text>
              <Button
                title="Başlat"
                size="sm"
                loading={isStartingReview}
                disabled={dueCount === 0}
                onPress={() => void startReviewSession()}
              />
            </Card>

            <Card className="flex-1 rounded-2xl border border-border bg-card p-sm">
              <View className="mb-md h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Ionicons name="book-outline" size={22} color={colors.primary} />
              </View>
              <Text className="mb-md text-base font-bold text-foreground">
                {newWordCount} Kelime Öğren
              </Text>
              <Button
                title="Başlat"
                size="sm"
                disabled={newWordCount === 0}
                onPress={() => void startSession(NEW_WORD_SESSION_SIZE, selectedListFilter)}
              />
            </Card>
          </View>

          {error ? (
            <Pressable
              onPress={() => void refetch()}
              accessibilityRole="button"
              accessibilityLabel="Tekrar bilgisini yenile"
              className="mt-sm rounded-xl border border-error/20 bg-error/5 p-sm"
            >
              <Text className="text-center text-sm font-semibold text-error">Tekrar bilgisi yenile</Text>
            </Pressable>
          ) : null}

          {isLoading && dueCount === 0 ? (
            <Text className="mt-sm text-center text-sm text-muted-foreground">Yükleniyor...</Text>
          ) : null}
        </View>

        <View className="px-md mb-lg">
          <Text className="mb-sm text-lg font-bold text-foreground">Hızlı Hafıza Egzersizleri</Text>
          <View className="gap-sm">
            <Pressable
              onPress={() => openExerciseSourceModal('listening')}
              accessibilityRole="button"
              accessibilityLabel="Dinleme kartlarını başlat"
            >
              <Card className="rounded-2xl border border-border bg-card p-md">
                <View className="flex-row items-center">
                  <View className="mr-sm h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <Ionicons name="volume-high-outline" size={22} color={colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-foreground">Dinleme Kartları</Text>
                    <Text className="mt-xs text-sm text-muted-foreground">Otomatik sesli döngü</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                </View>
              </Card>
            </Pressable>

            <Pressable
              onPress={() => openExerciseSourceModal('pronunciation')}
              accessibilityRole="button"
              accessibilityLabel="Telaffuz kartlarını başlat"
            >
              <Card className="rounded-2xl border border-border bg-card p-md">
                <View className="flex-row items-center">
                  <View className="mr-sm h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <Ionicons name="mic-outline" size={22} color={colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-foreground">Telaffuz Kartları</Text>
                    <Text className="mt-xs text-sm text-muted-foreground">Mikrofonla pratik</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                </View>
              </Card>
            </Pressable>
          </View>
        </View>

        <View className="px-md">
          <Text className="mb-sm text-lg font-bold text-foreground">Quiz & Egzersiz</Text>
          <Card className="rounded-2xl border border-border bg-card p-md">
            <Button title="Quiz Başlat" size="lg" onPress={() => router.push('/quiz')} />
          </Card>
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={exerciseMode !== null}
        onRequestClose={closeExerciseSourceModal}
      >
        <View className="flex-1 justify-center bg-black/40 px-md">
          <Card className="rounded-2xl border border-border bg-card p-md">
            <View className="mb-md flex-row items-start justify-between">
              <View>
                <Text className="text-lg font-bold text-foreground">Kelime Seç</Text>
              </View>
              <Pressable
                onPress={closeExerciseSourceModal}
                accessibilityRole="button"
                accessibilityLabel="Modal kapat"
                hitSlop={8}
                className="rounded-full bg-muted p-xs"
              >
                <Ionicons name="close" size={20} color={colors.foreground} />
              </Pressable>
            </View>

            <Button
              title="Tüm Kelimeler"
              onPress={() => void startExerciseWithSource()}
              loading={isLoadingExercise}
              className="mb-sm"
            />

            <Text className="mb-sm text-sm font-semibold text-muted-foreground">
              Kelime Seç (Listelerden)
            </Text>

            {lists.length > 0 ? (
              <View className="gap-sm">
                {lists.map((list) => (
                  <Pressable
                    key={list.id}
                    onPress={() => void startExerciseWithSource(list.id)}
                    disabled={isLoadingExercise || list.wordCount === 0}
                    accessibilityRole="button"
                    accessibilityLabel={`${list.name} listesini seç`}
                    accessibilityState={{ disabled: isLoadingExercise || list.wordCount === 0 }}
                    className={`rounded-xl border border-border p-sm ${
                      list.wordCount === 0 ? 'opacity-50' : 'active:bg-muted'
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="flex-1 text-base font-semibold text-foreground">
                        {list.name}
                      </Text>
                      <Text className="text-sm font-semibold text-muted-foreground">
                        {list.wordCount}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <EmptyState title="Liste yok" description="Liste oluşturduğunuzda burada görünür." />
            )}
          </Card>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        presentationStyle="fullScreen"
        visible={activeExercise !== null}
        onRequestClose={closeActiveExercise}
      >
        <View className="flex-1 bg-background">
          <View
            className="flex-row items-center justify-between px-md pb-sm"
            style={{ paddingTop: insets.top + 12 }}
          >
            <Pressable
              onPress={closeActiveExercise}
              accessibilityRole="button"
              accessibilityLabel="Egzersizi kapat"
              hitSlop={8}
              className="h-10 w-10 items-center justify-center rounded-full bg-muted active:opacity-80"
            >
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>

            <Text className="text-sm font-semibold text-muted-foreground">
              {exerciseWords.length > 0
                ? `${currentExerciseIndex + 1} / ${exerciseWords.length}`
                : 'Hazırlanıyor'}
            </Text>
          </View>

          <View className="flex-1 justify-center px-md">
            {currentExerciseWord ? (
              <View className="rounded-2xl bg-muted px-lg py-2xl">
                <Text className="text-center text-4xl font-bold text-foreground">
                  {currentExerciseWord.word}
                </Text>
                {activeExercise === 'listening' ? (
                  <Text className="mt-md text-center text-lg text-muted-foreground">
                    {currentExerciseWord.meaning}
                  </Text>
                ) : (
                  <Text className="mt-md text-center text-sm text-muted-foreground">
                    Telaffuz etmek için mikrofonu kullanın.
                  </Text>
                )}
              </View>
            ) : (
              <Text className="text-center text-sm text-muted-foreground">Kelime yükleniyor...</Text>
            )}

            {activeExercise === 'pronunciation' && lastTranscript ? (
              <Text className="mt-md text-center text-sm text-muted-foreground">
                Algılanan: {lastTranscript}
              </Text>
            ) : null}

            {activeExercise === 'pronunciation' && pronunciationFeedback ? (
              <Text className="mt-sm text-center text-sm font-semibold text-foreground">
                {pronunciationFeedback}
              </Text>
            ) : null}
          </View>

          <View className="px-md pt-sm" style={{ paddingBottom: insets.bottom + 18 }}>
            {activeExercise === 'listening' ? (
              <Button
                title={isListeningLoopActive ? 'Durdur' : 'Devam Et'}
                variant={isListeningLoopActive ? 'destructive' : 'primary'}
                size="lg"
                onPress={
                  isListeningLoopActive ? stopListeningLoop : () => startListeningLoop(exerciseWords)
                }
              />
            ) : (
              <View className="flex-row items-center gap-sm">
                <Button
                  title="Dinle"
                  variant="outline"
                  size="lg"
                  onPress={() => {
                    if (currentExerciseWord) {
                      Speech.speak(currentExerciseWord.word, {
                        language: 'en-US',
                        rate: 0.85,
                      });
                    }
                  }}
                  className="flex-1"
                />
                <Pressable
                  onPress={() => void handlePronunciationCheck()}
                  disabled={isRecognizing}
                  accessibilityRole="button"
                  accessibilityLabel="Mikrofonu başlat"
                  accessibilityState={{ busy: isRecognizing, disabled: isRecognizing }}
                  className="h-16 w-16 items-center justify-center rounded-full bg-primary active:opacity-90"
                >
                  <Ionicons name="mic" size={28} color={colors.primaryForeground} />
                </Pressable>
                <Button
                  title="Sonraki"
                  variant="secondary"
                  size="lg"
                  onPress={goToNextPronunciationWord}
                  className="flex-1"
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

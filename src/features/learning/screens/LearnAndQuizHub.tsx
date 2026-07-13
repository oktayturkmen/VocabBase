import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, FadeIn, Loading } from '@/components';
import { StoryCard } from '@/features/learning/components/StoryCard';
import { WordDetailSheet } from '@/features/learning/components/WordDetailSheet';
import { getAIService } from '@/services/ai';
import type { ListWithWordCount } from '@/services/list';
import { getSpeechRecognitionService } from '@/services/speech-recognition';
import { getDatabase } from '@/database/client';
import { createWordService } from '@/services/word';
import { useAppSettingsStore } from '@/store/app-settings.store';
import { useLearningStore } from '@/store/learning.store';
import { useListStore } from '@/store/list.store';
import { usePackageStore } from '@/store/package.store';
import { useTheme } from '@/theme/useTheme';
import type { Word } from '@/types/word';

type MemoryExerciseMode = 'listening' | 'pronunciation';

const NEW_WORD_SESSION_SIZE = 5;

type ExerciseCardConfig = {
  id: MemoryExerciseMode;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  accentBg: string;
  accentBgDark: string;
  cardBg: string;
  cardBorder: string;
};

const EXERCISE_CARDS: ExerciseCardConfig[] = [
  {
    id: 'listening',
    title: 'Dinleme Kartları',
    subtitle: 'Otomatik sesli döngü',
    icon: 'volume-high-outline',
    accentColor: '#ef4444',
    accentBg: 'bg-rose-100',
    accentBgDark: 'dark:bg-rose-900/40',
    cardBg: 'bg-rose-50/70 dark:bg-rose-950/20',
    cardBorder: 'border-rose-200/60 dark:border-rose-900/30',
  },
  {
    id: 'pronunciation',
    title: 'Telaffuz Kartları',
    subtitle: 'Mikrofonla pratik',
    icon: 'mic-outline',
    accentColor: '#7c3aed',
    accentBg: 'bg-purple-100',
    accentBgDark: 'dark:bg-purple-900/40',
    cardBg: 'bg-purple-50/50 dark:bg-purple-950/20',
    cardBorder: 'border-purple-200/60 dark:border-purple-900/30',
  },
];

type ListSelectionItemProps = {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  disabled?: boolean;
};

const ListSelectionItem = React.memo(function ListSelectionItem({
  onPress,
  icon,
  title,
  subtitle,
  disabled,
}: ListSelectionItemProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title} seç`}
      accessibilityState={{ disabled }}
      className={`flex-row items-center rounded-2xl px-md py-md ${
        disabled ? 'opacity-40' : 'active:bg-muted/50'
      }`}
    >
      <View className="mr-md h-11 w-11 items-center justify-center rounded-xl bg-muted">
        <Ionicons name={icon} size={20} color={colors.mutedForeground} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-foreground">{title}</Text>
        {subtitle ? <Text className="text-xs text-muted-foreground">{subtitle}</Text> : null}
      </View>
      {!disabled ? (
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      ) : null}
    </Pressable>
  );
});

type ListItemRowProps = {
  list: ListWithWordCount;
  disabled: boolean;
  onSelect: (listId: number) => void;
};

const ListItemRow = React.memo(function ListItemRow({ list, disabled, onSelect }: ListItemRowProps) {
  const isEmpty = list.wordCount === 0;
  const handlePress = useCallback(() => {
    onSelect(list.id);
  }, [list.id, onSelect]);

  return (
    <View>
      <ListSelectionItem
        onPress={handlePress}
        icon="folder-outline"
        title={list.name}
        subtitle={isEmpty ? 'Kelime yok' : `${list.wordCount} kelime`}
        disabled={disabled || isEmpty}
      />
    </View>
  );
});

export function LearnAndQuizHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { startRandomSession, startSessionWithAllListWords } = useLearningStore();
  const { lists, fetchLists } = useListStore();
  const { speechSpeed } = useAppSettingsStore();
  const { activePackageName } = usePackageStore();
  const [showListModal, setShowListModal] = useState(false);
  const [exerciseMode, setExerciseMode] = useState<MemoryExerciseMode | null>(null);
  const [activeExercise, setActiveExercise] = useState<MemoryExerciseMode | null>(null);
  const [exerciseWords, setExerciseWords] = useState<Word[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isLoadingExercise, setIsLoadingExercise] = useState(false);
  const [isListeningLoopActive, setIsListeningLoopActive] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [pronunciationFeedback, setPronunciationFeedback] = useState<string | null>(null);

  // AI Story Mode state
  const [story, setStory] = useState<string | null>(null);
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [selectedWordForDetail, setSelectedWordForDetail] = useState<string | null>(null);

  const currentExerciseWord = exerciseWords[currentExerciseIndex] ?? null;
  const listeningLoopActiveRef = useRef(false);
  const listeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playListeningPairRef = useRef<(words: Word[], index: number) => void>(() => {});

  useEffect(() => {
    void fetchLists();
  }, [fetchLists]);

  const handleOpenListModal = useCallback(() => {
    setShowListModal(true);
  }, []);

  const handleSelectListAndStart = useCallback(async (listId: number | null) => {
    setShowListModal(false);

    if (listId === null) {
      // "Tüm Kelimeler" selected: get random words from entire pool
      void startRandomSession(NEW_WORD_SESSION_SIZE, undefined);
    } else {
      // Specific list selected: get ALL words from that list
      void startSessionWithAllListWords(listId);
    }
  }, [startRandomSession, startSessionWithAllListWords]);

  const handleSelectAllLists = useCallback(() => {
    void handleSelectListAndStart(null);
  }, [handleSelectListAndStart]);

  const handleStartLearning = useCallback(() => {
    handleOpenListModal();
  }, [handleOpenListModal]);

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
        rate: speechSpeed,
        onDone: () => {
          if (!listeningLoopActiveRef.current) {
            return;
          }

          Speech.speak(word.meaning, {
            language: 'tr-TR',
            rate: speechSpeed,
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
  }, [speechSpeed]);

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
        const database = await getDatabase();
        const wordService = createWordService(database);
        let words: Word[];

        if (listId) {
          words = await wordService.getByListId(listId);
        } else {
          words = await wordService.getWordsByPackageName(activePackageName);
        }

        if (words.length === 0) {
          Alert.alert(
            'Kelime bulunamadı',
            listId
              ? 'Bu listede henüz kelime yok. Başka bir liste seçin veya yeni kelime ekleyin.'
              : 'Bu pakette kelime yok. Başka bir paket seçin.',
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
    [exerciseMode, startListeningLoop, activePackageName],
  );

  const handleStartExerciseAll = useCallback(() => {
    void startExerciseWithSource();
  }, [startExerciseWithSource]);

  const handleStartExerciseForList = useCallback(
    (listId: number) => {
      void startExerciseWithSource(listId);
    },
    [startExerciseWithSource],
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

    const isAvailable = await recognitionService.isAvailable();
    if (!isAvailable) {
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

  const handleGenerateStory = useCallback(async () => {
    setIsLoadingStory(true);
    setShowStory(true);
    setStory(null);

    try {
      const database = await getDatabase();
      const wordService = createWordService(database);
      const randomWords = await wordService.getRandomWordsByPackageName(activePackageName, NEW_WORD_SESSION_SIZE);

      if (randomWords.length === 0) {
        Alert.alert(
          'Kelime yok',
          'Bu pakette hikaye üretmek için yeterli kelime yok.',
        );
        setShowStory(false);
        return;
      }

      const selectedWords = randomWords.map((w: Word) => w.word);

      const aiService = getAIService();
      const generatedStory = await aiService.generateStoryFromWords(selectedWords);
      setStory(generatedStory);
    } catch (storyError) {
      Alert.alert(
        'Hikaye üretilemedi',
        storyError instanceof Error ? storyError.message : 'Bilinmeyen hata oluştu.',
      );
      setShowStory(false);
    } finally {
      setIsLoadingStory(false);
    }
  }, [activePackageName]);

  const handleWordPressInStory = useCallback((word: string) => {
    setSelectedWordForDetail(word);
  }, []);

  const handleCloseWordDetailSheet = useCallback(() => {
    setSelectedWordForDetail(null);
  }, []);

  const handleCloseStory = useCallback(() => {
    setShowStory(false);
    setStory(null);
  }, []);

  useEffect(() => stopListeningLoop, [stopListeningLoop]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Header ─────────────────────────────────────────── */}
        <FadeIn duration={600} delay={0}>
          <View
            className="px-lg"
            style={{ paddingTop: insets.top + 12 }}
          >
            <View>
              <Text className="text-sm font-medium text-muted-foreground">
                İngilizce Kelime Öğren
              </Text>
              <Text className="text-3xl font-bold text-foreground mt-xs">
                Öğren
              </Text>
            </View>
          </View>
        </FadeIn>

        {/* ─── Kelime Öğren — Hero Card ────────────────────────────── */}
        <FadeIn duration={600} delay={100}>
          <View className="px-md mt-lg">
            <View className="relative overflow-hidden rounded-3xl bg-amber-50/80 dark:bg-amber-950/30 p-lg shadow-lg shadow-amber-500/10">
              {/* Decorative circles */}
              <View className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-200/30 dark:bg-amber-800/20" />
              <View className="absolute -right-4 top-10 h-16 w-16 rounded-full bg-amber-300/20 dark:bg-amber-700/10" />
              <View className="absolute -left-6 -bottom-6 h-20 w-20 rounded-full bg-amber-200/20 dark:bg-amber-800/10" />

              <View className="relative">
                <View className="mb-sm h-14 w-14 items-center justify-center rounded-2xl bg-amber-200/70 dark:bg-amber-900/50">
                  <Ionicons name="book-outline" size={28} color="#f59e0b" />
                </View>
                <Text className="text-2xl font-bold text-foreground">
                  {NEW_WORD_SESSION_SIZE} Kelime Öğren
                </Text>
                <Text className="mt-xs text-sm text-muted-foreground">
                  Her seferinde 5 yeni kelime ile kelime dağarcığını genişlet
                </Text>
                <Button
                  title="Başlat"
                  size="md"
                  onPress={handleStartLearning}
                  className="mt-md w-full rounded-xl bg-emerald-600 active:opacity-90"
                  textClassName="text-white font-bold"
                />
              </View>
            </View>
          </View>
        </FadeIn>

        {/* ─── Kelime Paketleri ────────────────────────────────────── */}
        <FadeIn duration={500} delay={200}>
          <View className="px-md mt-md">
            <Pressable
              onPress={() => router.push('/packages')}
              className="flex-row items-center rounded-2xl border border-border bg-card p-md active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Kelime paketlerini gör"
            >
              <View className="mr-md h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40">
                <Ionicons name="cube-outline" size={24} color="#7c3aed" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground">Kelime Paketleri</Text>
                <Text className="text-xs text-muted-foreground">
                  A1, A2 ve tema paketlerini yükle
                </Text>
              </View>
              <View className="rounded-full bg-violet-100 dark:bg-violet-900/40 px-sm py-xs">
                <Text className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                  {activePackageName}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </FadeIn>

        {/* ─── Hafıza Egzersizleri ─────────────────────────────────── */}
        <View className="px-md mt-xl">
          <View className="mb-md flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground">Hafıza Egzersizleri</Text>
            <Ionicons name="fitness-outline" size={20} color={colors.mutedForeground} />
          </View>
          <View className="gap-md">
            {EXERCISE_CARDS.map((card, index) => (
              <FadeIn key={card.id} duration={500} delay={300 + index * 100}>
                <Pressable
                  onPress={() => openExerciseSourceModal(card.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${card.title} başlat`}
                >
                  <View
                    className={`flex-row items-center rounded-2xl border ${card.cardBorder} ${card.cardBg} p-md`}
                  >
                    <View
                      className={`mr-md h-14 w-14 items-center justify-center rounded-2xl ${card.accentBg} ${card.accentBgDark} shadow-sm`}
                    >
                      <Ionicons name={card.icon} size={28} color={card.accentColor} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-bold text-foreground">{card.title}</Text>
                      <Text className="mt-xs text-sm text-muted-foreground/80">
                        {card.subtitle}
                      </Text>
                    </View>
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-white/60 dark:bg-white/10">
                      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                    </View>
                  </View>
                </Pressable>
              </FadeIn>
            ))}
          </View>
        </View>

        {/* ─── AI Öykü Modu ────────────────────────────────────────── */}
        <FadeIn duration={500} delay={500}>
          <View className="px-md mt-xl">
            <View className="mb-md flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">AI Destekli Öğrenme</Text>
              <Ionicons name="sparkles-outline" size={20} color={colors.mutedForeground} />
            </View>

            {/* AI Story Card */}
            <Pressable
              onPress={handleGenerateStory}
              className="relative overflow-hidden rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/30 p-lg shadow-sm active:opacity-90"
              accessibilityRole="button"
              accessibilityLabel="AI ile hikaye üret"
              disabled={isLoadingStory}
            >
              <View className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-200/30 dark:bg-indigo-800/20" />
              <View className="relative flex-row items-center">
                <View className="mr-md h-14 w-14 items-center justify-center rounded-2xl bg-indigo-200/70 dark:bg-indigo-900/50">
                  <Ionicons name="bookmarks-outline" size={28} color="#4f46e5" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground">Hikaye Üret</Text>
                  <Text className="mt-xs text-sm text-muted-foreground/80">
                    Kelimelerin bağlam içinde akılda kalması için AI ile kısa hikaye üret
                  </Text>
                </View>
                {isLoadingStory ? (
                  <ActivityIndicator color="#4f46e5" />
                ) : (
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-white/60 dark:bg-white/10">
                    <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                  </View>
                )}
              </View>
            </Pressable>

            {/* AI Chat Partner Card */}
            <Pressable
              onPress={() => router.push('/roleplay')}
              className="relative overflow-hidden rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/30 p-lg shadow-sm mt-md active:opacity-90"
              accessibilityRole="button"
              accessibilityLabel="AI chat partner başlat"
            >
              <View className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-200/30 dark:bg-emerald-800/20" />
              <View className="relative flex-row items-center">
                <View className="mr-md h-14 w-14 items-center justify-center rounded-2xl bg-emerald-200/70 dark:bg-emerald-900/50">
                  <Ionicons name="chatbubbles-outline" size={28} color="#059669" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground">AI Chat Partner</Text>
                  <Text className="mt-xs text-sm text-muted-foreground/80">
                    Öğrendiğin kelimeleri canlı senaryolarda pratik et
                  </Text>
                </View>
                <View className="h-8 w-8 items-center justify-center rounded-full bg-white/60 dark:bg-white/10">
                  <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                </View>
              </View>
            </Pressable>
          </View>
        </FadeIn>

        {/* ─── Quiz ────────────────────────────────────────────────── */}
        <FadeIn duration={500} delay={600}>
          <View className="px-md mt-xl">
            <Pressable
              onPress={() => router.push('/quiz')}
              className="relative overflow-hidden rounded-3xl bg-cyan-50/70 dark:bg-cyan-950/30 p-lg shadow-sm active:opacity-90"
              accessibilityRole="button"
              accessibilityLabel="Quiz başlat"
            >
              <View className="absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-cyan-200/30 dark:bg-cyan-800/20" />
              <View className="relative flex-row items-center">
                <View className="mr-md h-14 w-14 items-center justify-center rounded-2xl bg-cyan-200/70 dark:bg-cyan-900/50">
                  <Ionicons name="trophy-outline" size={28} color="#0891b2" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground">Quiz Başlat</Text>
                  <Text className="mt-xs text-sm text-muted-foreground/80">
                    Bilgini test et, ilerlemeni gör
                  </Text>
                </View>
                <View className="h-8 w-8 items-center justify-center rounded-full bg-white/60 dark:bg-white/10">
                  <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                </View>
              </View>
            </Pressable>
          </View>
        </FadeIn>
      </ScrollView>

      {/* Exercise Source Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={exerciseMode !== null}
        onRequestClose={closeExerciseSourceModal}
      >
        <Pressable
          className="flex-1 justify-center bg-black/50 px-md"
          onPress={closeExerciseSourceModal}
        >
          <Pressable
            className="rounded-3xl bg-card p-lg shadow-xl"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="mb-md flex-row items-start justify-between">
              <View>
                <Text className="text-xl font-bold text-foreground">Kelime Seç</Text>
                <Text className="mt-xs text-sm text-muted-foreground">
                  Egzersiz için kelime kaynağı seçin
                </Text>
              </View>
              <Pressable
                onPress={closeExerciseSourceModal}
                accessibilityRole="button"
                accessibilityLabel="Modal kapat"
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full bg-muted"
              >
                <Ionicons name="close" size={20} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
              <ListSelectionItem
                onPress={handleStartExerciseAll}
                icon="layers-outline"
                title="Aktif Paket Kelimeleri"
                subtitle={`Aktif: ${activePackageName}`}
                disabled={isLoadingExercise}
              />

              {lists.length > 0 ? (
                lists.map((list) => (
                  <ListItemRow
                    key={list.id}
                    list={list}
                    disabled={isLoadingExercise}
                    onSelect={handleStartExerciseForList}
                  />
                ))
              ) : (
                <View className="py-lg">
                  <Text className="text-center text-sm text-muted-foreground">
                    Henüz liste oluşturulmadı
                  </Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Active Exercise Modal */}
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

            <View className="rounded-full bg-muted px-md py-xs">
              <Text className="text-sm font-semibold text-muted-foreground">
                {exerciseWords.length > 0
                  ? `${currentExerciseIndex + 1} / ${exerciseWords.length}`
                  : 'Hazırlanıyor'}
              </Text>
            </View>
          </View>

          <View className="flex-1 justify-center px-md">
            {currentExerciseWord ? (
              <View className="rounded-3xl bg-card px-xl py-2xl shadow-sm">
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
              <Text className="text-center text-sm text-muted-foreground">
                Kelime yükleniyor...
              </Text>
            )}

            {activeExercise === 'pronunciation' && lastTranscript ? (
              <View className="mt-md rounded-2xl bg-muted/50 px-md py-sm">
                <Text className="text-center text-sm text-muted-foreground">
                  Algılanan: <Text className="font-semibold text-foreground">{lastTranscript}</Text>
                </Text>
              </View>
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
                        rate: speechSpeed,
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
                  className="h-16 w-16 items-center justify-center rounded-full bg-primary shadow-md active:opacity-90"
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

      {/* List Selection Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={showListModal}
        onRequestClose={() => setShowListModal(false)}
      >
        <Pressable
          className="flex-1 justify-center bg-black/50 px-md"
          onPress={() => setShowListModal(false)}
        >
          <Pressable
            className="rounded-3xl bg-card p-lg shadow-xl"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="mb-md flex-row items-start justify-between">
              <View>
                <Text className="text-xl font-bold text-foreground">Liste Seç</Text>
                <Text className="mt-xs text-sm text-muted-foreground">
                  Çalışmak istediğiniz listeyi seçin
                </Text>
              </View>
              <Pressable
                onPress={() => setShowListModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Modal kapat"
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full bg-muted"
              >
                <Ionicons name="close" size={20} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
              <ListSelectionItem
                onPress={handleSelectAllLists}
                icon="layers-outline"
                title="Aktif Paket Kelimeleri"
                subtitle={`Aktif: ${activePackageName}`}
              />

              {lists.length > 0 ? (
                lists.map((list) => (
                  <ListItemRow
                    key={list.id}
                    list={list}
                    disabled={false}
                    onSelect={handleSelectListAndStart}
                  />
                ))
              ) : (
                <View className="py-lg">
                  <Text className="text-center text-sm text-muted-foreground">
                    Henüz liste oluşturulmadı
                  </Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* AI Story Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={showStory}
        onRequestClose={handleCloseStory}
      >
        <Pressable className="flex-1 bg-black/50" onPress={handleCloseStory}>
          <Pressable
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-card shadow-xl"
            style={{ paddingBottom: insets.bottom + 16, maxHeight: '80%' }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Grab handle */}
            <View className="self-center w-10 h-1 rounded-full bg-muted-foreground/30 mt-sm mb-md" />

            {/* Header */}
            <View className="flex-row items-center justify-between px-md pb-md">
              <View className="flex-row items-center gap-2">
                <Ionicons name="bookmarks" size={24} color="#4f46e5" />
                <Text className="text-lg font-bold text-foreground">AI Öykü Modu</Text>
              </View>
              <Pressable
                onPress={handleCloseStory}
                accessibilityRole="button"
                accessibilityLabel="Kapat"
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full bg-muted"
              >
                <Ionicons name="close" size={20} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            >
              {isLoadingStory ? (
                <View className="py-xl">
                  <Loading message="Hikaye üretiliyor..." />
                </View>
              ) : story ? (
                <View>
                  <StoryCard story={story} onWordPress={handleWordPressInStory} />
                  <Text className="mt-md text-center text-xs text-muted-foreground">
                    Kalın yazılı kelimelere dokunarak anlamını görebilirsin.
                  </Text>
                </View>
              ) : (
                <Text className="text-center text-sm text-muted-foreground py-lg">
                  Hikaye bulunamadı.
                </Text>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Word Detail Bottom Sheet */}
      <WordDetailSheet
        visible={selectedWordForDetail !== null}
        word={selectedWordForDetail}
        onClose={handleCloseWordDetailSheet}
      />
    </View>
  );
}
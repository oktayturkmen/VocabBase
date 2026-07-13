import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Loading } from '@/components';
import { useTheme } from '@/theme/useTheme';
import { getQuizService } from '@/services/quiz/quiz.service';
import { useGamificationStore } from '@/store/gamification.store';
import { useStatisticStore } from '@/store/statistic.store';
import { getLocalDateString } from '@/utils/date';

type MatchItem = {
  id: number;
  text: string;
};

export default function MatchingQuizScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [englishItems, setEnglishItems] = useState<MatchItem[]>([]);
  const [turkishItems, setTurkishItems] = useState<MatchItem[]>([]);
  
  const [selectedEnglishId, setSelectedEnglishId] = useState<number | null>(null);
  const [selectedTurkishId, setSelectedTurkishId] = useState<number | null>(null);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  
  const [wrongEnglishId, setWrongEnglishId] = useState<number | null>(null);
  const [wrongTurkishId, setWrongTurkishId] = useState<number | null>(null);

  const [mistakeCount, setMistakeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startTime] = useState(() => Date.now());
  const [endTime, setEndTime] = useState<number | null>(null);

  // Load words on mount
  useEffect(() => {
    async function loadWords() {
      try {
        setIsLoading(true);
        setError(null);
        const service = await getQuizService();
        const totalCount = await service.getWordCount();
        
        if (totalCount < 5) {
          setError('Eşleştirme oyunu için kütüphanenizde en az 5 kelime bulunmalıdır. Lütfen daha fazla kelime ekleyin.');
          setIsLoading(false);
          return;
        }

        const quizWords = await service.getQuizWords(5);

        // Shuffle English items
        const english = quizWords.map(w => ({ id: w.id, text: w.word }));
        const shuffledEnglish = [...english].sort(() => Math.random() - 0.5);

        // Shuffle Turkish items
        const turkish = quizWords.map(w => ({ id: w.id, text: w.meaning }));
        const shuffledTurkish = [...turkish].sort(() => Math.random() - 0.5);

        setEnglishItems(shuffledEnglish);
        setTurkishItems(shuffledTurkish);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kelimeler yüklenirken hata oluştu.');
        setIsLoading(false);
      }
    }

    void loadWords();
  }, []);

  // Handle Match checking
  const handleSelect = useCallback(async (id: number, type: 'english' | 'turkish') => {
    if (wrongEnglishId !== null || wrongTurkishId !== null) return; // Wait for error timeout
    if (matchedIds.includes(id)) return; // Already matched

    let activeEng = selectedEnglishId;
    let activeTur = selectedTurkishId;

    if (type === 'english') {
      if (selectedEnglishId === id) {
        setSelectedEnglishId(null);
        return;
      }
      setSelectedEnglishId(id);
      activeEng = id;
    } else {
      if (selectedTurkishId === id) {
        setSelectedTurkishId(null);
        return;
      }
      setSelectedTurkishId(id);
      activeTur = id;
    }

    // Check match if both selected
    if (activeEng !== null && activeTur !== null) {
      if (activeEng === activeTur) {
        // Correct match!
        const newMatched = [...matchedIds, activeEng];
        setMatchedIds(newMatched);
        setSelectedEnglishId(null);
        setSelectedTurkishId(null);

        // Game completed?
        if (newMatched.length === 5) {
          const gameEndTime = Date.now();
          setEndTime(gameEndTime);

          try {
            const today = getLocalDateString();
            const elapsedSeconds = Math.floor((gameEndTime - startTime) / 1000);
            
            // Record stats
            await useStatisticStore.getState().incrementQuizCorrect(today); // Increment correct quiz index
            await useStatisticStore.getState().addTimeSpent(today, elapsedSeconds);
            
            if (mistakeCount > 0) {
              await useStatisticStore.getState().incrementQuizIncorrect(today);
            }

            // Award XP
            const baseXP = 20;
            const perfectBonus = mistakeCount === 0 ? 10 : 0;
            const totalXP = baseXP + perfectBonus;
            
            await useGamificationStore.getState().addXp(totalXP);
          } catch (saveError) {
            console.error('Failed to save matching quiz stats:', saveError);
          }
        }
      } else {
        // Incorrect match!
        setWrongEnglishId(activeEng);
        setWrongTurkishId(activeTur);
        setMistakeCount(prev => prev + 1);

        setTimeout(() => {
          setWrongEnglishId(null);
          setWrongTurkishId(null);
          setSelectedEnglishId(null);
          setSelectedTurkishId(null);
        }, 800);
      }
    }
  }, [selectedEnglishId, selectedTurkishId, matchedIds, mistakeCount, startTime, wrongEnglishId, wrongTurkishId]);

  if (isLoading) {
    return <Loading message="Eşleştirme oyunu hazırlanıyor..." fullScreen />;
  }

  if (error) {
    return (
      <View className="flex-1 justify-center p-md bg-background">
        <Text className="text-lg text-error text-center mb-md leading-relaxed">{error}</Text>
        <Button title="Geri Dön" onPress={() => router.back()} />
      </View>
    );
  }

  const isCompleted = matchedIds.length === 5;
  const totalSeconds = endTime ? Math.floor((endTime - startTime) / 1000) : 0;
  const xpEarned = 20 + (mistakeCount === 0 ? 10 : 0);

  return (
    <View className="flex-1 bg-background justify-between p-lg" style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
      {/* Header */}
      <View className="flex-row justify-between items-center mb-md">
        <View>
          <Text className="text-sm font-semibold text-slate-400">Kelime Eşleştirme Oyunu</Text>
          <Text className="text-xs text-muted-foreground mt-0.5">Kelimeleri Türkçe karşılıklarıyla eşleştirin</Text>
        </View>
        <Pressable
          onPress={() => {
            Alert.alert(
              'Oyunu Sonlandır?',
              'Oyundan çıkmak istediğinizden emin misiniz?',
              [
                { text: 'Hayır', style: 'cancel' },
                { text: 'Evet', style: 'destructive', onPress: () => router.back() }
              ]
            );
          }}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full bg-card border border-border"
        >
          <Ionicons name="close" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Main Game Columns */}
      {!isCompleted ? (
        <View className="flex-1 flex-row gap-md my-md">
          {/* English Column */}
          <View className="flex-1 gap-sm">
            {englishItems.map((item) => {
              const isMatched = matchedIds.includes(item.id);
              const isSelected = selectedEnglishId === item.id;
              const isWrong = wrongEnglishId === item.id;

              return (
                <Pressable
                  key={`en-${item.id}`}
                  onPress={() => handleSelect(item.id, 'english')}
                  disabled={isMatched}
                  className={`flex-1 justify-center items-center px-sm rounded-2xl border active:opacity-85 ${
                    isMatched
                      ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-20'
                      : isWrong
                      ? 'bg-red-50 dark:bg-red-950/20 border-red-500'
                      : isSelected
                      ? 'bg-primary/10 border-primary border-2'
                      : 'bg-card border-border shadow-sm'
                  }`}
                >
                  <Text className={`text-base font-bold text-center ${
                    isMatched
                      ? 'text-slate-400'
                      : isWrong
                      ? 'text-red-600 dark:text-red-400'
                      : isSelected
                      ? 'text-primary'
                      : 'text-foreground'
                  }`}>
                    {item.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Turkish Column */}
          <View className="flex-1 gap-sm">
            {turkishItems.map((item) => {
              const isMatched = matchedIds.includes(item.id);
              const isSelected = selectedTurkishId === item.id;
              const isWrong = wrongTurkishId === item.id;

              return (
                <Pressable
                  key={`tr-${item.id}`}
                  onPress={() => handleSelect(item.id, 'turkish')}
                  disabled={isMatched}
                  className={`flex-1 justify-center items-center px-sm rounded-2xl border active:opacity-85 ${
                    isMatched
                      ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-20'
                      : isWrong
                      ? 'bg-red-50 dark:bg-red-950/20 border-red-500'
                      : isSelected
                      ? 'bg-primary/10 border-primary border-2'
                      : 'bg-card border-border shadow-sm'
                  }`}
                >
                  <Text className={`text-sm font-semibold text-center ${
                    isMatched
                      ? 'text-slate-400'
                      : isWrong
                      ? 'text-red-600 dark:text-red-400'
                      : isSelected
                      ? 'text-primary'
                      : 'text-foreground'
                  }`}>
                    {item.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        /* Victory Screen */
        <Card className="flex-1 justify-center items-center p-xl bg-card border border-border rounded-3xl my-md shadow-sm">
          <View className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/40 rounded-full items-center justify-center mb-lg">
            <Ionicons name="trophy" size={32} color="#10B981" />
          </View>

          <Text className="text-2xl font-extrabold text-foreground mb-xs">Tebrikler!</Text>
          <Text className="text-sm text-muted-foreground text-center mb-xl">
            Tüm kelimeleri başarıyla eşleştirdiniz.
          </Text>

          {/* Stats Box */}
          <View className="w-full bg-muted/30 rounded-2xl p-md gap-sm mb-xl">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-muted-foreground">Geçen Süre</Text>
              <Text className="text-sm font-bold text-foreground">{totalSeconds} saniye</Text>
            </View>
            <View className="flex-row justify-between items-center border-t border-border/50 pt-sm">
              <Text className="text-sm text-muted-foreground">Hata Sayısı</Text>
              <Text className="text-sm font-bold text-foreground">{mistakeCount} hata</Text>
            </View>
            <View className="flex-row justify-between items-center border-t border-border/50 pt-sm">
              <Text className="text-sm text-muted-foreground">Kazanılan XP</Text>
              <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{xpEarned} XP</Text>
            </View>
          </View>

          {mistakeCount === 0 ? (
            <View className="flex-row items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 px-3 py-1.5 rounded-full mb-lg">
              <Ionicons name="star" size={14} color="#10B981" />
              <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Hatasız Bonus (+10 XP)</Text>
            </View>
          ) : null}

          <Button
            title="Quize Dön"
            onPress={() => router.back()}
            className="w-full py-3"
          />
        </Card>
      )}

      {/* Footer Info (Active Match Progress) */}
      {!isCompleted && (
        <View className="flex-row justify-between items-center mt-sm">
          <Text className="text-xs text-muted-foreground">
            Hata: <Text className="font-bold text-foreground">{mistakeCount}</Text>
          </Text>
          <Text className="text-xs font-bold text-primary">
            Eşleşen: {matchedIds.length} / 5
          </Text>
        </View>
      )}
    </View>
  );
}

import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card, Loading, ProgressBar } from '@/components';
import { useQuizStore } from '@/store/quiz.store';

function gradeEmoji(percentage: number): string {
  if (percentage >= 90) return '🏆';
  if (percentage >= 70) return '🌟';
  if (percentage >= 50) return '👍';
  return '📚';
}

function gradeLabel(percentage: number): string {
  if (percentage >= 90) return 'Mükemmel!';
  if (percentage >= 70) return 'Harika iş!';
  if (percentage >= 50) return 'İyi çaba!';
  return 'Pratik yapmaya devam edin!';
}

function quizTypeLabel(quizType: string | null): string {
  if (quizType === 'typing') return 'Yazma Quiz';
  if (quizType === 'multiple-choice') return 'Çoktan Seçmeli Quiz';
  return 'Quiz';
}

export default function QuizResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    answers,
    score,
    questions,
    quizType,
    status,
    resetQuiz,
    startMultipleChoiceQuiz,
    startTypingQuiz,
  } = useQuizStore();

  const total = questions.length;
  const incorrectCount = total - score;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  useEffect(() => {
    if (status !== 'completed' || answers.length === 0) {
      router.replace('/quiz');
    }
  }, [status, answers.length, router]);

  if (status !== 'completed' || answers.length === 0) {
    return <Loading message="Sonuçlar yükleniyor..." fullScreen />;
  }

  const handleRetry = async () => {
    const previousQuizType = quizType;

    resetQuiz();

    if (previousQuizType === 'typing') {
      await startTypingQuiz(total);
      router.replace('/quiz/typing');
      return;
    }

    await startMultipleChoiceQuiz(total);
    router.replace('/quiz/multiple-choice');
  };

  const handleGoHome = () => {
    resetQuiz();
    router.dismissAll();
    router.replace('/(tabs)/learn');
  };

  return (
    <View className="flex-1 bg-background">
      <View
        className="items-center pb-lg px-md border-b border-border bg-card"
        style={{ paddingTop: insets.top + 16 }}
      >
        <Text className="text-xs font-semibold text-primary uppercase tracking-wider mb-sm">
          {quizTypeLabel(quizType)}
        </Text>
        <Text className="text-5xl mb-sm">{gradeEmoji(percentage)}</Text>
        <Text className="text-2xl font-extrabold text-foreground mb-xs">{gradeLabel(percentage)}</Text>
        <Text className="text-4xl font-bold text-primary mb-xs">
          {score} / {total}
        </Text>
        <Text className="text-sm text-muted-foreground mb-md">%{percentage} doğru</Text>
        <ProgressBar progress={percentage} className="w-full max-w-xs" />

        <View className="flex-row w-full max-w-xs mt-md gap-sm">
          <Card className="flex-1 items-center border border-green-600/30 bg-green-50/50 dark:bg-green-950/20 py-sm">
            <Text className="text-2xl font-bold text-green-600 dark:text-green-400">{score}</Text>
            <Text className="text-xs text-muted-foreground">Doğru</Text>
          </Card>
          <Card className="flex-1 items-center border border-red-600/30 bg-red-50/50 dark:bg-red-950/20 py-sm">
            <Text className="text-2xl font-bold text-red-600 dark:text-red-400">{incorrectCount}</Text>
            <Text className="text-xs text-muted-foreground">Yanlış</Text>
          </Card>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-sm">
          Cevap Detayları
        </Text>

        {answers.map((record, index) => (
          <Card
            key={`${record.wordId}-${index}`}
            className={[
              'mb-sm border',
              record.isCorrect
                ? 'border-green-600/30 bg-green-50/20 dark:border-green-500/20 dark:bg-green-950/10'
                : 'border-red-600/30 bg-red-50/20 dark:border-red-500/20 dark:bg-red-950/10',
            ].join(' ')}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-sm">
                <Text className="text-base font-bold text-foreground mb-xs">{record.word}</Text>
                <Text className="text-sm text-muted-foreground">
                  Cevabınız:{' '}
                  <Text
                    className={
                      record.isCorrect
                        ? 'text-green-600 dark:text-green-400 font-semibold'
                        : 'text-red-600 dark:text-red-400 font-semibold'
                    }
                  >
                    {record.userAnswer || '—'}
                  </Text>
                </Text>
                {!record.isCorrect && (
                  <Text className="text-sm text-muted-foreground mt-xs">
                    Doğru:{' '}
                    <Text className="text-green-600 dark:text-green-400 font-semibold">
                      {record.correctAnswer}
                    </Text>
                  </Text>
                )}
              </View>
              <View className="pt-0.5">
                {record.isCorrect ? (
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                ) : (
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                )}
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>

      <View
        className="px-md pt-md border-t border-border bg-card"
        style={{ paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 24 }}
      >
        <Button title="Tekrar Dene" onPress={handleRetry} className="w-full mb-sm" />
        <Button
          title="Tekrara Dön"
          variant="outline"
          onPress={handleGoHome}
          className="w-full"
        />
      </View>
    </View>
  );
}

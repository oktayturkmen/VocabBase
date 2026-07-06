import React, { useEffect } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card, Loading, ProgressBar } from '@/components';
import { useQuizStore } from '@/store/quiz.store';
import { useTheme } from '@/theme/useTheme';

export default function MultipleChoiceQuizScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    questions,
    currentIndex,
    selectedAnswer,
    status,
    isLoading,
    error,
    submitAnswer,
    nextQuestion,
    resetQuiz,
  } = useQuizStore();

  useEffect(() => {
    if (status === 'completed') {
      router.replace('/quiz/result');
    }
  }, [status, router]);

  if (isLoading && status === 'loading') {
    return <Loading message="Quiz soruları yükleniyor..." fullScreen />;
  }

  if (error && status !== 'active' && status !== 'completed') {
    return (
      <View className="flex-1 justify-center p-md bg-background">
        <Text className="text-lg text-error text-center mb-md">{error}</Text>
        <Button title="Geri Dön" onPress={() => router.back()} />
      </View>
    );
  }

  if (status === 'completed') {
    return <Loading message="Sonuçlar hesaplanıyor..." fullScreen />;
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) {
    return <Loading message="Sonraki soru yükleniyor..." fullScreen />;
  }

  const isAnswered = selectedAnswer !== null;

  return (
    <View className="flex-1 justify-between p-md bg-background">
      {/* Header and Progress */}
      <View className="mt-sm">
        <View className="flex-row justify-between items-center mb-xs">
          <Text className="text-sm font-semibold text-slate-400">Çoktan Seçmeli Quiz</Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-primary">
              {currentIndex + 1}. / {questions.length} Soru
            </Text>
            <Pressable
              onPress={() => {
                Alert.alert(
                  'Quizi Sonlandır?',
                  'Quizi sonlandırmak istediğinizden emin misiniz?',
                  [
                    { text: 'Hayır', style: 'cancel' },
                    {
                      text: 'Evet',
                      style: 'destructive',
                      onPress: () => {
                        resetQuiz();
                        router.back();
                      },
                    },
                  ],
                );
              }}
              hitSlop={8}
              className="ml-2"
            >
              <Ionicons name="close" size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>
        <ProgressBar progress={((currentIndex + 1) / questions.length) * 100} className="mt-xs" />
      </View>

      {/* Question Card */}
      <Card className="flex-1 justify-center my-lg border border-border shadow-sm p-lg bg-card rounded-2xl">
        <View className="items-center justify-center mb-md">
          <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-xs">
            Şu kelimenin anlamı nedir:
          </Text>
          <Text className="text-4xl font-extrabold text-foreground text-center tracking-wide">
            {currentQuestion.word}
          </Text>
        </View>

        {/* Options */}
        <View className="w-full space-y-3 mt-md">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrectOption = option === currentQuestion.correctAnswer;

            let optionClassName = 'border border-border bg-quizBackground py-4 px-md rounded-xl mb-sm';
            let textClassName = 'text-base font-medium text-foreground';

            if (isAnswered) {
              if (isCorrectOption) {
                // Correct option highlights green
                optionClassName = 'border-success bg-success/15 py-4 px-md rounded-xl mb-sm';
                textClassName = 'text-base font-semibold text-success';
              } else if (isSelected) {
                // Incorrect selected option highlights red
                optionClassName = 'border-error bg-error/15 py-4 px-md rounded-xl mb-sm';
                textClassName = 'text-base font-semibold text-error';
              } else {
                // Other options are dimmed
                optionClassName = 'border-border/30 bg-slate-50 py-4 px-md rounded-xl mb-sm opacity-50';
                textClassName = 'text-base text-foreground/50';
              }
            }

            return (
              <Pressable
                key={index}
                onPress={() => !isAnswered && submitAnswer(option)}
                className={optionClassName}
                disabled={isAnswered}
              >
                <Text className={textClassName}>{option}</Text>
                {isAnswered && isCorrectOption && <Text className="text-success text-base">✓</Text>}
                {isAnswered && isSelected && !isCorrectOption && (
                  <Text className="text-error text-base">✗</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Footer Actions */}
      <View className="mb-sm">
        {isAnswered ? (
          <Button
            title={currentIndex + 1 === questions.length ? 'Quizi Bitir' : 'Sonraki Soru'}
            onPress={nextQuestion}
            size="lg"
            className="w-full shadow-sm animate-fade-in"
          />
        ) : (
          <View className="h-[48px]" /> // Spacer to preserve layout structure
        )}
      </View>
    </View>
  );
}

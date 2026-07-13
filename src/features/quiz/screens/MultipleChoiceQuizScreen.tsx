import React, { useEffect } from 'react';
import { View, Text, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Loading, ProgressBar } from '@/components';
import { useQuizStore } from '@/store/quiz.store';
import { useTheme } from '@/theme/useTheme';

export default function MultipleChoiceQuizScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <View
      className="flex-1 bg-background justify-between px-md"
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 20,
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-grow-0"
        contentContainerStyle={{ flexGrow: 1 }}
      >
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
        <Card className="my-md border border-border shadow-sm p-md bg-card rounded-2xl">
          <View className="items-center justify-center mb-md pt-sm">
            <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-xs">
              Şu kelimenin anlamı nedir:
            </Text>
            <Text className="text-3xl font-extrabold text-foreground text-center tracking-wide">
              {currentQuestion.word}
            </Text>
          </View>

          {/* Options */}
          <View className="w-full gap-y-2.5 mt-sm">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrectOption = option === currentQuestion.correctAnswer;

              let optionClassName = 'border border-border bg-card py-3 px-md rounded-xl mb-xs';
              let textClassName = 'text-base font-medium text-foreground';

              if (isAnswered) {
                if (isCorrectOption) {
                  // Correct option highlights green
                  optionClassName = 'border-green-600 bg-green-50 dark:border-green-500 dark:bg-green-950/30 py-3 px-md rounded-xl mb-xs';
                  textClassName = 'text-base font-semibold text-green-600 dark:text-green-400';
                } else if (isSelected) {
                  // Incorrect selected option highlights red
                  optionClassName = 'border-red-600 bg-red-50 dark:border-red-500 dark:bg-red-950/20 py-3 px-md rounded-xl mb-xs';
                  textClassName = 'text-base font-semibold text-red-600 dark:text-red-400';
                } else {
                  // Other options are dimmed
                  optionClassName = 'border-border/30 bg-slate-50 dark:bg-slate-900/40 py-3 px-md rounded-xl mb-xs opacity-40';
                  textClassName = 'text-base text-foreground/40';
                }
              }

              return (
                <Pressable
                  key={index}
                  onPress={() => !isAnswered && submitAnswer(option)}
                  className={`flex-row justify-between items-center ${optionClassName}`}
                  disabled={isAnswered}
                >
                  <Text className={`flex-1 pr-sm ${textClassName}`}>{option}</Text>
                  {isAnswered && isCorrectOption && (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  )}
                  {isAnswered && isSelected && !isCorrectOption && (
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Card>
      </ScrollView>

      {/* Footer Actions */}
      <View className="pt-sm">
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

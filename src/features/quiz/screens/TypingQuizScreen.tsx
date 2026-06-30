import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Loading, ProgressBar } from '@/components';
import { normaliseAnswer } from '@/features/quiz/utils/answer.utils';
import { colors } from '@/theme/colors';
import { useQuizStore } from '@/store/quiz.store';

export default function TypingQuizScreen() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<TextInput>(null);

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
  const isCorrect =
    isAnswered && normaliseAnswer(selectedAnswer) === normaliseAnswer(currentQuestion.correctAnswer);

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    Keyboard.dismiss();
    submitAnswer(inputValue.trim());
  };

  const handleNext = () => {
    setInputValue('');
    nextQuestion();
    // Re-focus input for next question
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  return (
    <View className="flex-1 justify-between p-md bg-background">
      {/* Header and Progress */}
      <View className="mt-sm">
        <View className="flex-row justify-between items-center mb-xs">
          <Text className="text-sm font-semibold text-muted-foreground">YAZMA QUIZ</Text>
          <Text className="text-sm font-semibold text-primary">
            {currentIndex + 1}. / {questions.length} Soru
          </Text>
        </View>
        <ProgressBar progress={((currentIndex + 1) / questions.length) * 100} className="mt-xs" />
      </View>

      {/* Question Card */}
      <Card className="flex-1 justify-center my-lg border border-border shadow-sm p-lg bg-card rounded-2xl">
        <View className="items-center mb-lg">
          <Text className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-xs">
            Şu kelimenin Türkçe anlamını yazın:
          </Text>
          <Text className="text-4xl font-extrabold text-foreground text-center tracking-wide">
            {currentQuestion.word}
          </Text>
        </View>

        {/* Input area */}
        <TextInput
          ref={inputRef}
          value={inputValue}
          onChangeText={isAnswered ? undefined : setInputValue}
          onSubmitEditing={!isAnswered ? handleSubmit : undefined}
          editable={!isAnswered}
          returnKeyType="done"
          autoCorrect={false}
          autoCapitalize="none"
          placeholder="Anlamı buraya yazın..."
          placeholderTextColor={colors.mutedForeground}
          className={[
            'rounded-xl border px-md py-sm text-lg text-foreground text-center mb-md',
            !isAnswered && 'border-border bg-background',
            isAnswered && isCorrect && 'border-success bg-success/10 text-success',
            isAnswered && !isCorrect && 'border-error bg-error/10 text-error',
          ]
            .filter(Boolean)
            .join(' ')}
        />

        {/* Feedback */}
        {isAnswered && (
          <View className="items-center mt-xs">
            {isCorrect ? (
              <Text className="text-success text-base font-semibold">✓ Doğru!</Text>
            ) : (
              <View className="items-center">
                <Text className="text-error text-base font-semibold mb-xs">✗ Yanlış</Text>
                <Text className="text-sm text-muted-foreground">
                  Doğru cevap:{' '}
                  <Text className="font-bold text-foreground">{currentQuestion.correctAnswer}</Text>
                </Text>
              </View>
            )}
          </View>
        )}
      </Card>

      {/* Footer Actions */}
      <View className="mb-sm">
        {!isAnswered ? (
          <Button
            title="Cevabı Gönder"
            onPress={handleSubmit}
            size="lg"
            className="w-full shadow-sm"
            disabled={!inputValue.trim()}
          />
        ) : (
          <Button
            title={currentIndex + 1 === questions.length ? 'Quizi Bitir' : 'Sonraki Soru'}
            onPress={handleNext}
            size="lg"
            className="w-full shadow-sm"
          />
        )}
        <Button
          title="Quizi Sonlandır"
          variant="ghost"
          onPress={() => {
            resetQuiz();
            router.dismissAll();
            router.replace('/(tabs)/learn');
          }}
          className="mt-xs py-sm"
          textClassName="text-muted-foreground text-sm font-medium"
        />
      </View>
    </View>
  );
}

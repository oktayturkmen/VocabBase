import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card } from '@/components';
import { useQuizStore } from '@/store/quiz.store';

export default function QuizLandingScreen() {
  const router = useRouter();
  const startMultipleChoiceQuiz = useQuizStore((state) => state.startMultipleChoiceQuiz);
  const startTypingQuiz = useQuizStore((state) => state.startTypingQuiz);

  const handleStartMultipleChoice = async () => {
    await startMultipleChoiceQuiz(10);
    router.push('/quiz/multiple-choice');
  };

  const handleStartTyping = async () => {
    await startTypingQuiz(10);
    router.push('/quiz/typing');
  };

  return (
    <View className="flex-1 justify-center p-md bg-background">
      <View className="items-center mb-lg">
        <View className="bg-primary/10 p-lg rounded-full mb-md">
          <Text className="text-4xl">🎯</Text>
        </View>
        <Text className="text-2xl font-bold text-foreground text-center mb-xs">
          Kelime Quiz
        </Text>
        <Text className="text-base text-muted-foreground text-center px-md">
          Kelime hazinenizi test edin ve ilerlemenizi takip edin. Pratik yapmak için bir quiz modu seçin.
        </Text>
      </View>

      <Card className="mb-md border border-border bg-card p-md">
        <Text className="text-lg font-bold text-foreground mb-xs">Çoktan Seçmeli</Text>
        <Text className="text-sm text-muted-foreground mb-md">
          Dört seçenek arasından doğru çeviriyi seçin. Tanıma pratiği için en iyisi.
        </Text>
        <Button
          title="Çoktan Seçmeli Quiz Başlat"
          onPress={handleStartMultipleChoice}
          className="w-full shadow-sm"
        />
      </Card>

      <Card className="mb-lg border border-border bg-card p-md">
        <Text className="text-lg font-bold text-foreground mb-xs">Yazma Quiz</Text>
        <Text className="text-sm text-muted-foreground mb-md">
          Doğru çeviriyi yazın. Yazım ve hatırlama pratiği için en iyisi.
        </Text>
        <Button
          title="Yazma Quiz Başlat"
          variant="secondary"
          onPress={handleStartTyping}
          className="w-full shadow-sm"
        />
      </Card>

      <Button title="Geri Dön" variant="ghost" onPress={() => router.back()} className="w-full" />
    </View>
  );
}

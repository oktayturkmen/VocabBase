import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuizStore } from '@/store/quiz.store';

type QuizModeCardProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: readonly [string, string, ...string[]];
  onPress: () => void;
};

function QuizModeCard({ title, icon, colors, onPress }: QuizModeCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title} quizini başlat`}
      className="w-full mb-4 rounded-3xl overflow-hidden active:opacity-90"
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: 96 }}
      >
        <View className="flex-row justify-between items-center p-6 h-full">
          <Text className="text-2xl font-bold text-white">{title}</Text>
          <Ionicons name={icon} size={36} color="white" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function QuizLandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık */}
        <View className="px-md">
          <Text className="text-3xl font-bold text-foreground">Kelime Quiz</Text>
          <Text className="mt-xs text-base text-muted-foreground">
            Kelime hazinenizi test edin ve ilerlemenizi takip edin.
          </Text>
        </View>

        {/* Quiz Mod Kartları */}
        <View className="px-md mt-8">
          <QuizModeCard
            title="Çoktan Seçmeli"
            icon="list"
            colors={['#06b6d4', '#4f46e5']}
            onPress={handleStartMultipleChoice}
          />

          <QuizModeCard
            title="Yazma Quiz"
            icon="create"
            colors={['#3b82f6', '#1e293b']}
            onPress={handleStartTyping}
          />
        </View>

        {/* Geri Dön Linki */}
        <View className="flex-1 items-center justify-end mt-xl">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Geri dön"
            hitSlop={12}
            className="py-sm"
          >
            <Text className="text-base text-muted-foreground">← Geri Dön</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
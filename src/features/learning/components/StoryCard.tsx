import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/useTheme';

type StoryCardProps = {
  story: string;
  onWordPress: (word: string) => void;
};

type StorySegment = {
  type: 'text' | 'word';
  content: string;
};

/**
 * AI tarafından üretilen hikayeyi parse eder ve **kelime** şeklinde
 * işaretlenmiş kelimeleri tıklanabilir hale getirir.
 */
function parseStory(story: string): StorySegment[] {
  const segments: StorySegment[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(story)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: story.slice(lastIndex, match.index),
      });
    }

    segments.push({
      type: 'word',
      content: match[1],
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < story.length) {
    segments.push({
      type: 'text',
      content: story.slice(lastIndex),
    });
  }

  return segments;
}

export const StoryCard = React.memo(function StoryCard({
  story,
  onWordPress,
}: StoryCardProps) {
  const { colors } = useTheme();
  const segments = useMemo(() => parseStory(story), [story]);
  const wordCount = segments.filter((s) => s.type === 'word').length;

  return (
    <View className="relative overflow-hidden rounded-3xl bg-indigo-50/80 dark:bg-indigo-950/40 p-xl border border-indigo-200/50 dark:border-indigo-800/30 shadow-sm">
      <View className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-indigo-200/20 dark:bg-indigo-800/10" />

      <View className="relative flex-row items-center mb-md">
        <View className="mr-sm h-10 w-10 items-center justify-center rounded-xl bg-indigo-200/70 dark:bg-indigo-800/50">
          <Ionicons name="book" size={20} color="#4f46e5" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
            AI Hikaye
          </Text>
          <Text className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
            {wordCount} hedef kelime
          </Text>
        </View>
      </View>

      <Text className="relative text-base leading-7 text-foreground">
        {segments.map((segment, index) => {
          if (segment.type === 'word') {
            return (
              <Text
                key={index}
                onPress={() => onWordPress(segment.content)}
                className="font-bold text-indigo-600 dark:text-indigo-400 underline decoration-indigo-400/50"
              >
                {segment.content}
              </Text>
            );
          }

          return (
            <Text key={index} className="text-foreground">
              {segment.content}
            </Text>
          );
        })}
      </Text>

      <View className="relative mt-md flex-row items-center pt-md border-t border-indigo-200/40 dark:border-indigo-800/30">
        <Ionicons name="hand-left-outline" size={14} color={colors.mutedForeground} />
        <Text className="ml-xs text-xs text-muted-foreground">
          Kalın kelimelere dokunarak anlamını gör
        </Text>
      </View>
    </View>
  );
});
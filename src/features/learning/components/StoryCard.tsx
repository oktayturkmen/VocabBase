import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

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
  // **kelime** pattern'ini yakala
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(story)) !== null) {
    // Match'ten önceki normal metni ekle
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: story.slice(lastIndex, match.index),
      });
    }

    // Eşleşen kelimeyi ekle
    segments.push({
      type: 'word',
      content: match[1],
    });

    lastIndex = regex.lastIndex;
  }

  // Kalan metni ekle
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
  const segments = useMemo(() => parseStory(story), [story]);

  return (
    <View className="rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/30 p-lg border border-cyan-200/60 dark:border-cyan-900/30 shadow-sm">
      <Text className="mb-sm text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
        AI Story Mode
      </Text>
      <Text className="text-base leading-relaxed text-foreground">
        {segments.map((segment, index) => {
          if (segment.type === 'word') {
            return (
              <Text
                key={index}
                onPress={() => onWordPress(segment.content)}
                className="text-cyan-600 dark:text-cyan-400 font-bold underline"
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
    </View>
  );
});